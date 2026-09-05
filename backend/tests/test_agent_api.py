from __future__ import annotations

import asyncio
import hashlib
import io
import json
import os
import secrets
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from unittest.mock import patch

from app.core.config import Settings
from app.core.errors import AppError
from app.db.database import Database
from app.db.models import (
    DemoPrincipal,
    IdempotencyRecord,
    InsightEvent,
    LearningActivity,
    Message,
    QuotaLedger,
    QuotaReservation,
)
from app.main import create_app
from app.rag.indexer import build_index
from app.schemas.auth import UsageWire
from app.schemas.chat import (
    AgentChatRequestWire,
    AgentChatResponseWire,
    MemorySuggestionWire,
)
from app.schemas.enums import IdempotencyStatus, ReservationStatus, ResponseType
from app.services.auth import get_usage
from app.services.quota import (
    finalize_agent_request,
    recover_reservations,
    release_agent_request,
    reserve_agent_request,
)
from fastapi.testclient import TestClient
from openai import AsyncOpenAI as RealAsyncOpenAI
from PIL import Image
from scripts.seed import seed_database
from sqlalchemy import delete, event, func, select
from sqlalchemy.orm import Session as OrmSession


def _png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), color=(20, 80, 140)).save(buffer, format="PNG")
    return buffer.getvalue()


class AgentApiIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        environment = patch.dict(
            os.environ, {"ANONYMIZED_TELEMETRY": "False"}, clear=True
        )
        environment.start()
        self.addCleanup(environment.stop)
        self.temporary_directory = tempfile.TemporaryDirectory(
            prefix="futureai-agent-api-test-"
        )
        self.data_dir = Path(self.temporary_directory.name)
        self.codes = {
            key: secrets.token_urlsafe(32)
            for key in (
                "student_demo",
                "second_student",
                "teacher_demo",
                "government_demo",
            )
        }
        self.settings = Settings(
            _env_file=None,
            app_env="test",
            runtime_mode="offline_demo",
            data_dir=self.data_dir,
            chroma_path=self.data_dir / "chroma",
            database_url=f"sqlite:///{self.data_dir / 'app.db'}",
            demo_access_codes=self.codes,
        )
        database = Database(self.settings)
        seed_database(database, datetime.now(timezone.utc).date())
        with database.session_factory() as db, db.begin():
            db.add(
                DemoPrincipal(
                    id="test-principal-second-student",
                    config_key="second_student",
                    user_id="demo_student_02",
                    daily_quota_limit=20,
                    enabled=True,
                )
            )
        database.dispose()
        first_counts = asyncio.run(build_index(self.settings))
        second_counts = asyncio.run(build_index(self.settings))
        self.assertEqual(first_counts, {"curriculum": 18, "policy": 12})
        self.assertEqual(second_counts, first_counts)
        self.client_context = TestClient(create_app(self.settings))
        self.client = self.client_context.__enter__()
        self.student_headers = self._exchange("student_demo")
        self.second_headers = self._exchange("second_student")
        self.teacher_headers = self._exchange("teacher_demo")
        self.government_headers = self._exchange("government_demo")

    def tearDown(self) -> None:
        self.client_context.__exit__(None, None, None)
        self.temporary_directory.cleanup()

    def _exchange(self, config_key: str) -> dict[str, str]:
        response = self.client.post(
            "/api/v1/auth/demo/session",
            json={"access_code": self.codes[config_key]},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def _body(self, **overrides: Any) -> dict[str, Any]:
        body: dict[str, Any] = {
            "user_id": "demo_student_01",
            "conversation_id": None,
            "mode": "learning",
            "message": "請解釋牛頓第二定律",
            "attachment_ids": [],
            "category": None,
            "topic": "newton",
        }
        body.update(overrides)
        return body

    def _post(
        self,
        key: str,
        body: dict[str, Any],
        *,
        alias: bool = False,
        headers: dict[str, str] | None = None,
    ):
        request_headers = dict(headers or self.student_headers)
        request_headers["Idempotency-Key"] = key
        path = "/api/v1/chat" if alias else "/api/v1/agent/chat"
        return self.client.post(path, headers=request_headers, json=body)

    def _usage(self) -> dict[str, Any]:
        response = self.client.get("/api/v1/usage", headers=self.student_headers)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_history_orders_new_questions_and_followups_by_latest_activity(
        self,
    ) -> None:
        first = self._post("recent-first", self._body())
        second = self._post("recent-second", self._body())
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 200, second.text)
        first_answer, second_answer = first.json(), second.json()

        def history() -> list[dict[str, Any]]:
            response = self.client.get(
                "/api/v1/conversations",
                params={"user_id": "demo_student_01"},
                headers=self.student_headers,
            )
            self.assertEqual(response.status_code, 200, response.text)
            return response.json()["items"]

        before = history()
        self.assertEqual(before[0]["conversation_id"], second_answer["conversation_id"])
        followup = self._post(
            "recent-followup",
            self._body(
                conversation_id=first_answer["conversation_id"],
                message=first_answer["suggested_follow_ups"][0],
            ),
        )
        self.assertEqual(followup.status_code, 200, followup.text)
        after = history()
        self.assertEqual(after[0]["conversation_id"], first_answer["conversation_id"])
        self.assertGreater(
            datetime.fromisoformat(after[0]["updated_at"]),
            datetime.fromisoformat(before[0]["updated_at"]),
        )
        # Demo evidence timestamps stay fixed; a replay does not become a new
        # activity or consume another unit of quota.
        self.assertEqual(first_answer["created_at"], followup.json()["created_at"])
        used = self._usage()["used"]
        replay = self._post("recent-second", self._body())
        self.assertEqual(replay.json(), second_answer)
        self.assertEqual(history(), after)
        self.assertEqual(self._usage()["used"], used)

    @staticmethod
    def _quota_response(label: str, now: datetime) -> AgentChatResponseWire:
        return AgentChatResponseWire(
            conversation_id=f"conversation-{label}",
            message_id=f"message-{label}",
            response_type=ResponseType.TEXT,
            text="quota transition test",
            learning_answer=None,
            resource_recommendation=None,
            memory_suggestion=None,
            alert=None,
            sources=[],
            suggested_follow_ups=[],
            created_at=now,
            demo=True,
            usage=UsageWire(
                limit=20,
                used=0,
                reserved=1,
                remaining=19,
                reset_at=now + timedelta(days=1),
            ),
        )

    def assert_error(self, response: Any, status: int, code: str) -> None:
        self.assertEqual(response.status_code, status, response.text)
        self.assertEqual(response.json()["error"]["code"], code)

    def test_learning_snapshot_alias_idempotency_followup_and_dashboard_delta(
        self,
    ) -> None:
        teacher_before = self.client.get(
            "/api/v1/dashboard/teacher", headers=self.teacher_headers
        ).json()["summary"]["question_count"]
        government_before = self.client.get(
            "/api/v1/dashboard/government", headers=self.government_headers
        ).json()["totals"]["event_count"]

        body = self._body(message="  請解釋牛頓第二定律  ")
        first = self._post("learning-replay", body)
        self.assertEqual(first.status_code, 200, first.text)
        payload = first.json()
        self.assertTrue(payload["demo"])
        self.assertEqual(payload["response_type"], "learning_answer")
        answer = payload["learning_answer"]
        self.assertGreaterEqual(len(answer["steps"]), 3)
        self.assertIsNotNone(answer["practice"])
        self.assertLess(
            answer["practice"]["answer_index"], len(answer["practice"]["options"])
        )
        self.assertTrue(payload["sources"])
        available = {item["source_id"] for item in payload["sources"]}
        self.assertTrue(set(answer["source_ids"]).issubset(available))
        self.assertEqual(payload["usage"]["used"], 1)
        self.assertEqual(payload["usage"]["reserved"], 0)
        self.assertGreater(
            datetime.fromisoformat(payload["usage"]["reset_at"]),
            datetime.now(timezone.utc),
        )

        replay = self._post("learning-replay", body, alias=True)
        self.assertEqual(replay.status_code, 200, replay.text)
        self.assertEqual(replay.json(), payload)
        self.assertEqual(self._usage()["used"], 1)

        conflict = self._post(
            "learning-replay",
            self._body(message="相同 key 的另一個問題"),
            alias=True,
        )
        self.assert_error(conflict, 409, "IDEMPOTENCY_CONFLICT")
        self.assertEqual(self._usage()["used"], 1)

        detail = self.client.get(
            f"/api/v1/conversations/{payload['conversation_id']}",
            headers=self.student_headers,
        )
        self.assertEqual(detail.status_code, 200, detail.text)
        messages = detail.json()["messages"]
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0]["text"], "請解釋牛頓第二定律")
        self.assertEqual(messages[1]["learning_answer"], answer)
        self.assertEqual(messages[1]["sources"], payload["sources"])

        follow_up = self._post(
            "learning-follow-up",
            self._body(
                conversation_id=payload["conversation_id"],
                mode="auto",
                message="那公車煞車時呢？",
                topic=None,
            ),
        )
        self.assertEqual(follow_up.status_code, 200, follow_up.text)
        self.assertEqual(
            follow_up.json()["conversation_id"], payload["conversation_id"]
        )
        self.assertEqual(follow_up.json()["learning_answer"]["scenario_id"], "newton")
        self.assertEqual(
            follow_up.json()["learning_answer"]["title"], "身體保留原本的速度"
        )

        with self.client.app.state.database.session_factory() as db:
            activity = db.scalar(
                select(LearningActivity).where(
                    LearningActivity.message_id == payload["message_id"]
                )
            )
            self.assertIsNotNone(activity)
            self.assertIsNone(activity.practice_correct)
            self.assertIsNone(activity.animation_completed)
            insight_count = db.scalar(
                select(func.count(InsightEvent.id)).where(
                    InsightEvent.message_id == payload["message_id"]
                )
            )
            self.assertEqual(insight_count, 1)

        teacher_after = self.client.get(
            "/api/v1/dashboard/teacher", headers=self.teacher_headers
        ).json()["summary"]["question_count"]
        government_after = self.client.get(
            "/api/v1/dashboard/government", headers=self.government_headers
        ).json()["totals"]["event_count"]
        self.assertEqual(teacher_after, teacher_before + 2)
        self.assertEqual(government_after, government_before + 2)

    def test_all_authored_learning_followups_preserve_rich_payload(self) -> None:
        with self.client.app.state.database.session_factory() as db, db.begin():
            principal = db.get(DemoPrincipal, "demo-principal-student")
            principal.daily_quota_limit = 100
        scenarios = json.loads(
            (Path(__file__).parents[1] / "data/curriculum/scenarios.json").read_text(
                encoding="utf-8"
            )
        )
        followups = {
            item["topic"]: item["follow_ups"]
            for item in json.loads(
                (
                    Path(__file__).parents[1] / "data/curriculum/followups.json"
                ).read_text(encoding="utf-8")
            )
        }
        self.assertEqual(sum(len(items) for items in followups.values()), 18)
        for scenario in scenarios:
            topic = scenario["topic"]
            overview = self._post(
                f"authored-overview-{topic}",
                self._body(
                    message=scenario["canonical_question"],
                    topic=topic,
                ),
            )
            self.assertEqual(overview.status_code, 200, overview.text)
            overview_answer = overview.json()["learning_answer"]
            for index, authored in enumerate(followups[topic]):
                response = self._post(
                    f"authored-followup-{topic}-{index}",
                    self._body(
                        conversation_id=overview.json()["conversation_id"],
                        mode="auto",
                        message=authored["question"],
                        topic=None,
                    ),
                )
                self.assertEqual(response.status_code, 200, response.text)
                answer = response.json()["learning_answer"]
                self.assertEqual(answer["title"], authored["title"])
                self.assertEqual(answer["summary"], authored["summary"])
                self.assertEqual(answer["steps"], authored["steps"])
                self.assertEqual(answer["source_ids"], authored["source_ids"])
                self.assertEqual(answer["practice"], overview_answer["practice"])
                self.assertEqual(answer["animation_topic"], topic)
                available = {item["source_id"] for item in response.json()["sources"]}
                self.assertTrue(set(authored["source_ids"]).issubset(available))

    def test_all_authored_resource_followups_answer_instead_of_repeating_summary(
        self,
    ) -> None:
        with self.client.app.state.database.session_factory() as db, db.begin():
            principal = db.get(DemoPrincipal, "demo-principal-student")
            principal.daily_quota_limit = 100
        resources = json.loads(
            (Path(__file__).parents[1] / "data/policies/followups.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertEqual(sum(len(item["follow_ups"]) for item in resources), 18)
        for scenario in resources:
            category = scenario["category"]
            overview = self._post(
                f"resource-overview-{category}",
                self._body(
                    mode="resource",
                    message=scenario["canonical_question"],
                    topic=None,
                    category=category,
                ),
            )
            self.assertEqual(overview.status_code, 200, overview.text)
            summary = overview.json()["resource_recommendation"]["summary"]
            self.assertEqual(
                overview.json()["resource_recommendation"]["program_id"],
                scenario["canonical_program_id"],
            )
            for index, authored in enumerate(scenario["follow_ups"]):
                response = self._post(
                    f"resource-authored-{category}-{index}",
                    self._body(
                        conversation_id=overview.json()["conversation_id"],
                        mode="auto",
                        message=authored["question"],
                        topic=None,
                        category=None,
                    ),
                )
                self.assertEqual(response.status_code, 200, response.text)
                self.assertEqual(response.json()["text"], authored["answer"])
                self.assertNotEqual(response.json()["text"], summary)

    def test_explicit_routes_and_existing_conversations_reject_unrelated_content(
        self,
    ) -> None:
        learning = self._post(
            "supported-before-rejections",
            self._body(message="請解釋牛頓第二定律"),
        )
        self.assertEqual(learning.status_code, 200, learning.text)
        resource = self._post(
            "supported-resource-before-rejections",
            self._body(
                mode="resource",
                message="家裡務農，颱風後農損想找補助",
                topic=None,
                category="agriculture",
            ),
        )
        self.assertEqual(resource.status_code, 200, resource.text)
        used_before = self._usage()["used"]
        with self.client.app.state.database.session_factory() as db:
            messages_before = db.scalar(select(func.count(Message.id)))
            insights_before = db.scalar(select(func.count(InsightEvent.id)))

        cases = [
            self._body(
                message="請計算牛頓法求解這個五次方程式",
                topic="newton",
            ),
            self._body(message="幫我規劃日本七日旅遊", topic="newton"),
            self._body(
                mode="resource",
                message="幫我寫一封英文求職信",
                topic=None,
                category="agriculture",
            ),
            self._body(
                conversation_id=learning.json()["conversation_id"],
                mode="auto",
                message="幫我規劃日本七日旅遊",
                topic=None,
            ),
            self._body(
                conversation_id=resource.json()["conversation_id"],
                mode="auto",
                message="幫我寫一封英文求職信",
                topic=None,
                category=None,
            ),
        ]
        for index, body in enumerate(cases):
            response = self._post(f"unrelated-{index}", body)
            self.assert_error(response, 503, "OFFLINE_DEMO_UNAVAILABLE")
        usage = self._usage()
        self.assertEqual(usage["used"], used_before)
        self.assertEqual(usage["reserved"], 0)
        with self.client.app.state.database.session_factory() as db:
            self.assertEqual(db.scalar(select(func.count(Message.id))), messages_before)
            self.assertEqual(
                db.scalar(select(func.count(InsightEvent.id))), insights_before
            )

    def test_all_offline_scenarios_resources_memory_and_unsupported_refund(
        self,
    ) -> None:
        topics = [
            ("newton", "牛頓"),
            ("thermodynamics", "熱力學"),
            ("entropy", "熵"),
            ("equilibrium", "化學平衡"),
            ("bonding", "化學鍵"),
            ("reaction-rate", "反應速率"),
        ]
        for index, (topic, label) in enumerate(topics):
            response = self._post(
                f"topic-{index}", self._body(message=f"請教我{label}", topic=topic)
            )
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["learning_answer"]["scenario_id"], topic)
            self.assertTrue(response.json()["demo"])

        remove_memory = self.client.delete(
            "/api/v1/profile/demo_student_01/memory/family_occupation",
            headers=self.student_headers,
        )
        self.assertEqual(remove_memory.status_code, 204, remove_memory.text)
        categories = [
            ("agriculture", "家裡務農，颱風後農損想找補助"),
            ("disaster", "住家災害後需要安置"),
            ("education", "學費與助學貸款"),
            ("economy", "家庭遇到急難，生活費不足"),
            ("health", "最近壓力大睡不好，想找心理健康資源"),
            ("other", "不知道找誰，想問社會福利中心"),
        ]
        responses: list[dict[str, Any]] = []
        for index, (category, message) in enumerate(categories):
            response = self._post(
                f"resource-{index}",
                self._body(
                    mode="resource",
                    message=message,
                    topic=None,
                    category=category,
                ),
            )
            self.assertEqual(response.status_code, 200, response.text)
            self.assertTrue(response.json()["demo"])
            resource = response.json()["resource_recommendation"]
            self.assertEqual(resource["category"], category)
            self.assertIn(
                resource["eligibility_status"],
                ("possibly_eligible", "needs_confirmation", None),
            )
            self.assertTrue(resource["source_ids"])
            responses.append(response.json())

        agriculture = responses[0]
        self.assertIsNotNone(agriculture["memory_suggestion"])
        suggestion_expiry = datetime.fromisoformat(
            agriculture["memory_suggestion"]["expires_at"]
        )
        lifetime_hours = (
            suggestion_expiry - datetime.now(timezone.utc)
        ).total_seconds() / 3600
        self.assertGreater(lifetime_hours, 23.9)
        self.assertLessEqual(lifetime_hours, 24.0)
        profile = self.client.get(
            "/api/v1/profile/demo_student_01", headers=self.student_headers
        )
        self.assertIsNone(profile.json()["family_occupation"])
        self.assertFalse(
            any(
                item["key"] == "family_occupation"
                for item in profile.json()["memories"]
            )
        )
        consent = self.client.post(
            "/api/v1/profile/demo_student_01/memory",
            headers=self.student_headers,
            json={
                "suggestion_id": agriculture["memory_suggestion"]["suggestion_id"],
                "consent": True,
            },
        )
        self.assertEqual(consent.status_code, 201, consent.text)
        self.assertEqual(consent.json()["value"], "farmer")

        follow_up = self._post(
            "resource-follow-up",
            self._body(
                conversation_id=agriculture["conversation_id"],
                mode="auto",
                message="那要準備什麼資料？",
                topic=None,
                category=None,
            ),
        )
        self.assertEqual(follow_up.status_code, 200, follow_up.text)
        self.assertEqual(
            follow_up.json()["resource_recommendation"]["program_id"],
            agriculture["resource_recommendation"]["program_id"],
        )

        used_before = self._usage()["used"]
        unsupported_body = self._body(
            mode="auto",
            message="幫我分析一個資料集中不存在的冷門問題",
            topic=None,
        )
        first_failure = self._post("unsupported-retry", unsupported_body)
        second_failure = self._post("unsupported-retry", unsupported_body, alias=True)
        self.assert_error(first_failure, 503, "OFFLINE_DEMO_UNAVAILABLE")
        self.assert_error(second_failure, 503, "OFFLINE_DEMO_UNAVAILABLE")
        usage = self._usage()
        self.assertEqual(usage["used"], used_before)
        self.assertEqual(usage["reserved"], 0)
        with self.client.app.state.database.session_factory() as db:
            failed = db.scalar(
                select(IdempotencyRecord).where(
                    IdempotencyRecord.idempotency_key == "unsupported-retry"
                )
            )
            self.assertEqual(failed.status, IdempotencyStatus.FAILED)

    def test_attachment_disclosure_ownership_mode_and_validation(self) -> None:
        upload = self.client.post(
            "/api/v1/uploads",
            headers=self.student_headers,
            files={"file": ("diagram.png", _png_bytes(), "image/png")},
        )
        self.assertEqual(upload.status_code, 201, upload.text)
        attachment_id = upload.json()["attachment_id"]
        response = self._post(
            "offline-image",
            self._body(attachment_ids=[attachment_id]),
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn("離線示範無法辨識圖片內容", response.json()["text"])
        detail = self.client.get(
            f"/api/v1/conversations/{response.json()['conversation_id']}",
            headers=self.student_headers,
        ).json()
        self.assertEqual(detail["messages"][0]["attachment_ids"], [attachment_id])

        image_only = self._post(
            "offline-image-only",
            self._body(message="", topic=None, attachment_ids=[attachment_id]),
        )
        self.assert_error(image_only, 503, "OFFLINE_DEMO_UNAVAILABLE")

        foreign_upload = self.client.post(
            "/api/v1/uploads",
            headers=self.second_headers,
            files={"file": ("foreign.png", _png_bytes(), "image/png")},
        )
        self.assertEqual(foreign_upload.status_code, 201, foreign_upload.text)
        used_before = self._usage()["used"]
        foreign = self._post(
            "foreign-attachment",
            self._body(attachment_ids=[foreign_upload.json()["attachment_id"]]),
        )
        self.assert_error(foreign, 403, "USER_SCOPE_FORBIDDEN")
        self.assertEqual(self._usage()["used"], used_before)

        mode_conflict = self._post(
            "mode-conflict",
            self._body(
                conversation_id=response.json()["conversation_id"],
                mode="resource",
                message="想找補助",
                topic=None,
                category="economy",
            ),
        )
        self.assert_error(mode_conflict, 409, "CONVERSATION_MODE_CONFLICT")
        blank_key = self._post("   ", self._body())
        self.assert_error(blank_key, 422, "VALIDATION_ERROR")
        too_many = self._post(
            "too-many-files",
            self._body(attachment_ids=[attachment_id] * 4),
        )
        self.assert_error(too_many, 422, "VALIDATION_ERROR")

        profile = self.client.get(
            "/api/v1/profile/demo_student_01", headers=self.student_headers
        ).json()
        update = self.client.put(
            "/api/v1/profile/demo_student_01",
            headers=self.student_headers,
            json={
                "nickname": profile["nickname"],
                "grade": profile["grade"],
                "region": "火星區",
                "family_occupation": profile["family_occupation"],
                "family_type": profile["family_type"],
                "economic_status": profile["economic_status"],
                "other_identities": profile["other_identities"],
            },
        )
        self.assertEqual(update.status_code, 200, update.text)
        unknown_region = self._post(
            "unknown-region",
            self._body(
                mode="resource",
                message="需要學費補助",
                topic=None,
                category="education",
            ),
        )
        self.assertEqual(unknown_region.status_code, 200, unknown_region.text)
        with self.client.app.state.database.session_factory() as db:
            insight = db.scalar(
                select(InsightEvent).where(
                    InsightEvent.message_id == unknown_region.json()["message_id"]
                )
            )
            self.assertIsNone(insight.region)

    def test_offline_requests_continue_after_daily_limit_and_replay_once(self) -> None:
        with self.client.app.state.database.session_factory() as db, db.begin():
            db.get(DemoPrincipal, "demo-principal-student").daily_quota_limit = 1
        for index in range(3):
            response = self._post(f"unlimited-{index}", self._body())
            self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self._usage()["used"], 3)
        replay = self._post("unlimited-2", self._body())
        self.assertEqual(replay.status_code, 200, replay.text)
        self.assertEqual(replay.json()["message_id"], response.json()["message_id"])
        self.assertEqual(self._usage()["used"], 3)
        with self.client.app.state.database.session_factory() as db:
            principal = db.get(DemoPrincipal, "demo-principal-student")
            with self.assertRaises(AppError) as caught:
                reserve_agent_request(
                    db, self.settings.model_copy(update={"runtime_mode": "live"}),
                    principal, "back-to-live", AgentChatRequestWire.model_validate(self._body()),
                )
            self.assertEqual(caught.exception.code, "QUOTA_EXCEEDED")

    def test_atomic_quota_admission_and_expiry_only_startup_recovery(self) -> None:
        with self.client.app.state.database.session_factory() as db, db.begin():
            principal = db.get(DemoPrincipal, "demo-principal-student")
            principal.daily_quota_limit = 1

        barrier = threading.Barrier(2)

        def send(index: int):
            barrier.wait()
            return self._post(
                f"concurrent-{index}",
                self._body(message="請解釋牛頓第二定律"),
            )

        # Exercise live admission while keeping the answer provider offline.
        def live_reserve(db, settings, principal, key, body):
            return reserve_agent_request(
                db, settings.model_copy(update={"runtime_mode": "live"}), principal, key, body
            )

        with patch("app.services.agent.reserve_agent_request", side_effect=live_reserve):
            with ThreadPoolExecutor(max_workers=2) as executor:
                responses = list(executor.map(send, range(2)))
        self.assertEqual(sorted(item.status_code for item in responses), [200, 429])
        quota_error = next(item for item in responses if item.status_code == 429)
        self.assert_error(quota_error, 429, "QUOTA_EXCEEDED")
        self.assertGreaterEqual(int(quota_error.headers["Retry-After"]), 1)
        self.assertEqual(
            quota_error.json()["error"]["details"]["usage"]["remaining"], 0
        )
        usage = self._usage()
        self.assertEqual((usage["used"], usage["reserved"]), (1, 0))

        # A fresh temporary principal makes startup recovery independent of the
        # intentionally exhausted student quota above.
        with self.client.app.state.database.session_factory() as db, db.begin():
            principal = db.get(DemoPrincipal, "test-principal-second-student")
            principal.daily_quota_limit = 2
        request = AgentChatRequestWire.model_validate(
            self._body(
                user_id="demo_student_02",
                message="牛頓力學怎麼解釋：物體受力了，為什麼不一定會加速？",
            )
        )
        with self.client.app.state.database.session_factory() as db:
            principal = db.get(DemoPrincipal, "test-principal-second-student")
            reserved = reserve_agent_request(
                db, self.settings, principal, "restart-recovery", request
            )
            self.assertIsNotNone(reserved.reservation)
        self.client_context.__exit__(None, None, None)
        self.client_context = TestClient(create_app(self.settings))
        self.client = self.client_context.__enter__()

        usage_response = self.client.get("/api/v1/usage", headers=self.second_headers)
        self.assertEqual(usage_response.status_code, 200, usage_response.text)
        self.assertEqual(usage_response.json()["reserved"], 1)
        active_retry = self._post(
            "restart-recovery",
            request.model_dump(mode="json"),
            headers=self.second_headers,
        )
        self.assert_error(active_retry, 409, "IDEMPOTENCY_CONFLICT")

        with self.client.app.state.database.session_factory() as db, db.begin():
            reservation = db.scalar(
                select(QuotaReservation)
                .join(IdempotencyRecord)
                .where(IdempotencyRecord.idempotency_key == "restart-recovery")
            )
            reservation.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.client_context.__exit__(None, None, None)
        self.client_context = TestClient(create_app(self.settings))
        self.client = self.client_context.__enter__()
        usage_response = self.client.get("/api/v1/usage", headers=self.second_headers)
        self.assertEqual(usage_response.json()["reserved"], 0)
        retry = self._post(
            "restart-recovery",
            request.model_dump(mode="json"),
            headers=self.second_headers,
        )
        self.assertEqual(retry.status_code, 200, retry.text)
        with self.client.app.state.database.session_factory() as db:
            rows = list(
                db.scalars(
                    select(QuotaReservation)
                    .join(IdempotencyRecord)
                    .where(IdempotencyRecord.idempotency_key == "restart-recovery")
                )
            )
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0].status, ReservationStatus.FINALIZED)

    def test_rate_limit_is_separate_from_quota_and_shared_by_alias(self) -> None:
        self.settings.agent_rate_limit_requests = 1
        first = self._post("rate-first", self._body())
        self.assertEqual(first.status_code, 200, first.text)
        second = self._post("rate-second", self._body(), alias=True)
        self.assert_error(second, 429, "RATE_LIMITED")
        retry_after = int(second.headers["Retry-After"])
        self.assertGreaterEqual(retry_after, 1)
        details = second.json()["error"]["details"]
        self.assertEqual(details["retry_after_seconds"], retry_after)
        self.assertEqual(
            {key: details["usage"][key] for key in ("used", "reserved", "remaining")},
            {"used": 1, "reserved": 0, "remaining": 19},
        )

    def test_expired_lease_attempt_identity_blocks_late_finalize_and_release(
        self,
    ) -> None:
        request = AgentChatRequestWire.model_validate(self._body())
        with self.client.app.state.database.session_factory() as db:
            principal = db.get(DemoPrincipal, "demo-principal-student")
            old = reserve_agent_request(
                db, self.settings, principal, "attempt-aba", request
            ).reservation
        self.assertIsNotNone(old)
        with self.client.app.state.database.session_factory() as db, db.begin():
            row = db.get(QuotaReservation, old.reservation_id)
            row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        with self.client.app.state.database.session_factory() as db:
            self.assertEqual(recover_reservations(db), 1)
        with self.client.app.state.database.session_factory() as db:
            principal = db.get(DemoPrincipal, "demo-principal-student")
            new = reserve_agent_request(
                db, self.settings, principal, "attempt-aba", request
            ).reservation
        self.assertIsNotNone(new)
        self.assertEqual(new.reservation_id, old.reservation_id)
        self.assertNotEqual(new.attempt_id, old.attempt_id)

        with self.client.app.state.database.session_factory() as db:
            release_agent_request(db, old)
            ledger = db.get(QuotaLedger, new.ledger_id)
            self.assertEqual((ledger.used_count, ledger.reserved_count), (0, 1))
        with (
            self.client.app.state.database.session_factory() as db,
            self.assertRaisesRegex(RuntimeError, "attempt identity"),
        ):
            finalize_agent_request(
                db,
                old,
                self._quota_response("late-old", datetime.now(timezone.utc)),
            )
        with self.client.app.state.database.session_factory() as db:
            row = db.get(QuotaReservation, new.reservation_id)
            ledger = db.get(QuotaLedger, new.ledger_id)
            record = db.get(IdempotencyRecord, new.idempotency_record_id)
            self.assertEqual(row.attempt_id, new.attempt_id)
            self.assertEqual(row.status, ReservationStatus.RESERVED)
            self.assertEqual(record.status, IdempotencyStatus.RESERVED)
            self.assertEqual((ledger.used_count, ledger.reserved_count), (0, 1))

        with self.client.app.state.database.session_factory() as db:
            usage = finalize_agent_request(
                db,
                new,
                self._quota_response("new", datetime.now(timezone.utc)),
            )
            db.commit()
            self.assertEqual((usage.used, usage.reserved), (1, 0))
        with self.client.app.state.database.session_factory() as db:
            release_agent_request(db, old)
            ledger = db.get(QuotaLedger, new.ledger_id)
            self.assertEqual((ledger.used_count, ledger.reserved_count), (1, 0))

    def test_offline_quota_uses_real_utc_day_windows(self) -> None:
        request = AgentChatRequestWire.model_validate(self._body())
        first_day = datetime(2032, 1, 10, 23, 59, tzinfo=timezone.utc)
        second_day = datetime(2032, 1, 11, 0, 1, tzinfo=timezone.utc)
        with (
            patch("app.services.quota.utc_now", return_value=first_day),
            self.client.app.state.database.session_factory() as db,
        ):
            principal = db.get(DemoPrincipal, "demo-principal-student")
            first = reserve_agent_request(
                db, self.settings, principal, "utc-day-one", request
            ).reservation
            finalize_agent_request(
                db, first, self._quota_response("day-one", first_day)
            )
            db.commit()

        with (
            patch("app.services.quota.utc_now", return_value=second_day),
            self.client.app.state.database.session_factory() as db,
        ):
            principal = db.get(DemoPrincipal, "demo-principal-student")
            second = reserve_agent_request(
                db, self.settings, principal, "utc-day-two", request
            ).reservation
        with (
            patch("app.services.auth.utc_now", return_value=second_day),
            self.client.app.state.database.session_factory() as db,
        ):
            principal = db.get(DemoPrincipal, "demo-principal-student")
            usage = get_usage(db, principal)
            self.assertEqual((usage.used, usage.reserved), (0, 1))
            self.assertEqual(
                usage.reset_at.date(), second_day.date() + timedelta(days=1)
            )
        with self.client.app.state.database.session_factory() as db:
            ledgers = list(
                db.scalars(
                    select(QuotaLedger)
                    .where(QuotaLedger.principal_id == "demo-principal-student")
                    .order_by(QuotaLedger.window_start)
                )
            )
            self.assertEqual(len(ledgers), 2)
            self.assertEqual(
                [(item.used_count, item.reserved_count) for item in ledgers],
                [(1, 0), (0, 1)],
            )
        with self.client.app.state.database.session_factory() as db:
            release_agent_request(db, second)

    def test_finalize_release_are_atomic_with_stale_concurrent_sessions(self) -> None:
        request = AgentChatRequestWire.model_validate(
            self._body(message="請解釋牛頓第二定律")
        )

        def clear_quota() -> None:
            with self.client.app.state.database.session_factory() as db, db.begin():
                db.execute(delete(QuotaReservation))
                db.execute(delete(IdempotencyRecord))
                db.execute(delete(QuotaLedger))
                principal = db.get(DemoPrincipal, "demo-principal-student")
                principal.daily_quota_limit = 20

        def reserve_pair(prefix: str):
            reservations = []
            with self.client.app.state.database.session_factory() as db:
                principal = db.get(DemoPrincipal, "demo-principal-student")
                for index in range(2):
                    result = reserve_agent_request(
                        db,
                        self.settings,
                        principal,
                        f"{prefix}-{index}",
                        request,
                    )
                    reservations.append(result.reservation)
            self.assertTrue(all(item is not None for item in reservations))
            return reservations

        def response(label: str) -> AgentChatResponseWire:
            now = datetime.now(timezone.utc)
            return AgentChatResponseWire(
                conversation_id=f"conversation-{label}",
                message_id=f"message-{label}",
                response_type=ResponseType.MEMORY_SUGGESTION,
                text="quota transition test",
                learning_answer=None,
                resource_recommendation=None,
                memory_suggestion=MemorySuggestionWire(
                    suggestion_id=f"suggestion-{label}",
                    key="test",
                    value="test",
                    display_value="test",
                    reason=None,
                    expires_at=now + timedelta(hours=1),
                ),
                alert=None,
                sources=[],
                suggested_follow_ups=[],
                created_at=now,
                demo=True,
                usage=UsageWire(
                    limit=20,
                    used=0,
                    reserved=2,
                    remaining=18,
                    reset_at=now + timedelta(days=1),
                ),
            )

        for prefix, actions, expected in (
            ("finalize-finalize", ("finalize", "finalize"), (2, 0)),
            ("finalize-release", ("finalize", "release"), (1, 0)),
            ("release-release", ("release", "release"), (0, 0)),
        ):
            with self.subTest(actions=actions):
                clear_quota()
                reservations = reserve_pair(prefix)
                ledger_id = reservations[0].ledger_id
                barrier = threading.Barrier(2)

                def wait_when_old_service_loads_ledger(
                    _session: Any,
                    instance: Any,
                    _ledger_id: str = ledger_id,
                    _barrier: threading.Barrier = barrier,
                ) -> None:
                    if (
                        isinstance(instance, QuotaLedger)
                        and instance.id == _ledger_id
                        and threading.current_thread().name.startswith("quota-race")
                    ):
                        _barrier.wait(timeout=5)

                event.listen(
                    OrmSession,
                    "loaded_as_persistent",
                    wait_when_old_service_loads_ledger,
                )
                try:

                    def run(
                        index: int,
                        _reservations=reservations,
                        _actions=actions,
                        _prefix: str = prefix,
                    ):
                        reserved = _reservations[index]
                        with self.client.app.state.database.session_factory() as db:
                            if _actions[index] == "release":
                                release_agent_request(db, reserved)
                                return None
                            result = finalize_agent_request(
                                db, reserved, response(f"{_prefix}-{index}")
                            )
                            db.commit()
                            return result

                    with ThreadPoolExecutor(
                        max_workers=2, thread_name_prefix="quota-race"
                    ) as executor:
                        usages = list(executor.map(run, range(2)))
                finally:
                    event.remove(
                        OrmSession,
                        "loaded_as_persistent",
                        wait_when_old_service_loads_ledger,
                    )

                with self.client.app.state.database.session_factory() as db:
                    ledger = db.get(QuotaLedger, ledger_id)
                    self.assertEqual(
                        (ledger.used_count, ledger.reserved_count), expected
                    )
                    statuses = list(
                        db.scalars(
                            select(QuotaReservation.status)
                            .where(QuotaReservation.ledger_id == ledger_id)
                            .order_by(QuotaReservation.id)
                        )
                    )
                self.assertEqual(
                    sorted(status.value for status in statuses),
                    sorted(
                        "finalized" if action == "finalize" else "released"
                        for action in actions
                    ),
                )
                finalized_usages = [item for item in usages if item is not None]
                if actions == ("finalize", "finalize"):
                    self.assertEqual(
                        sorted((item.used, item.reserved) for item in finalized_usages),
                        [(1, 1), (2, 0)],
                    )

                before_duplicate = expected
                for index, action in enumerate(actions):
                    reserved = reservations[index]
                    with self.client.app.state.database.session_factory() as db:
                        if action == "release":
                            release_agent_request(db, reserved)
                        else:
                            duplicate_usage = finalize_agent_request(
                                db, reserved, response(f"duplicate-{prefix}-{index}")
                            )
                            db.commit()
                            self.assertEqual(
                                (duplicate_usage.used, duplicate_usage.reserved),
                                before_duplicate,
                            )
                with self.client.app.state.database.session_factory() as db:
                    ledger = db.get(QuotaLedger, ledger_id)
                    self.assertEqual(
                        (ledger.used_count, ledger.reserved_count), before_duplicate
                    )

    def test_same_key_parallel_reserves_once_and_retries_after_release(self) -> None:
        request = AgentChatRequestWire.model_validate(
            self._body(message="請解釋牛頓第二定律")
        )
        barrier = threading.Barrier(2)

        def reserve_same_key(_index: int):
            with self.client.app.state.database.session_factory() as db:
                principal = db.get(DemoPrincipal, "demo-principal-student")
                barrier.wait()
                try:
                    result = reserve_agent_request(
                        db, self.settings, principal, "same-key-race", request
                    )
                    return "reserved", result.reservation
                except AppError as exc:
                    return exc.code, None

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(reserve_same_key, range(2)))
        self.assertEqual(
            sorted(item[0] for item in results),
            ["IDEMPOTENCY_CONFLICT", "reserved"],
        )
        winner = next(item[1] for item in results if item[1] is not None)
        with self.client.app.state.database.session_factory() as db:
            ledger = db.get(QuotaLedger, winner.ledger_id)
            self.assertEqual((ledger.used_count, ledger.reserved_count), (0, 1))
            self.assertEqual(db.scalar(select(func.count(QuotaReservation.id))), 1)

        with self.client.app.state.database.session_factory() as db:
            release_agent_request(db, winner)
        with self.client.app.state.database.session_factory() as db:
            principal = db.get(DemoPrincipal, "demo-principal-student")
            retry = reserve_agent_request(
                db, self.settings, principal, "same-key-race", request
            )
            self.assertIsNotNone(retry.reservation)
            ledger = db.get(QuotaLedger, retry.reservation.ledger_id)
            self.assertEqual((ledger.used_count, ledger.reserved_count), (0, 1))
            release_agent_request(db, retry.reservation)


class MockProviderState:
    def __init__(self, learning_answer: dict[str, Any]) -> None:
        self.learning_answer = learning_answer
        self.lock = threading.Lock()
        self.requests: list[tuple[str, dict[str, Any]]] = []

    def add(self, path: str, payload: dict[str, Any]) -> None:
        with self.lock:
            self.requests.append((path, payload))


class MockProviderHandler(BaseHTTPRequestHandler):
    server: Any

    def log_message(self, _format: str, *args: Any) -> None:
        return

    def _write(self, status: int, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        try:
            self.wfile.write(encoded)
        except BrokenPipeError:
            pass

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length))
        state: MockProviderState = self.server.state
        state.add(self.path, payload)
        serialized = json.dumps(payload, ensure_ascii=False)
        if self.path.endswith("/embeddings"):
            vectors = []
            for index, value in enumerate(payload["input"]):
                digest = hashlib.sha256(value.encode("utf-8")).digest()
                vector = [(digest[offset] / 127.5) - 1 for offset in range(16)]
                vectors.append(
                    {"object": "embedding", "embedding": vector, "index": index}
                )
            self._write(
                200,
                {
                    "object": "list",
                    "data": vectors,
                    "model": payload["model"],
                    "usage": {"prompt_tokens": 1, "total_tokens": 1},
                },
            )
            return
        if "provider-error" in serialized:
            self._write(500, {"error": {"message": "mock unavailable"}})
            return
        if "slow-provider" in serialized:
            time.sleep(1.3)

        schema_name = payload["response_format"]["json_schema"]["name"]
        if schema_name == "IntentDecision":
            content: dict[str, Any] = {
                "mode": "resource",
                "topic": None,
                "category": "agriculture",
            }
        elif schema_name == "LiveResourceGeneration":
            envelope = json.loads(payload["messages"][-1]["content"][0]["text"])
            program_ids = [
                item["program_id"] for item in envelope["candidate_programs"]
            ]
            selected_program_id = (
                "demo-agriculture-disaster-aid"
                if "demo-agriculture-disaster-aid" in program_ids
                else program_ids[0]
            )
            content = {
                "program_id": selected_program_id,
                "suggested_follow_ups": ["還缺哪些條件？"],
            }
        else:
            answer = json.loads(json.dumps(state.learning_answer))
            if "invalid-source" in serialized:
                answer["source_ids"] = ["invented-source"]
            if "invalid-practice" in serialized:
                answer["practice"]["answer_index"] = 99
            if "incompatible-payload" in serialized:
                content = {
                    "program_id": "demo-agriculture-disaster-aid",
                    "suggested_follow_ups": [],
                }
            else:
                content = {
                    "text": "這是 mock live provider 的結構化回答。",
                    "learning_answer": answer,
                    "suggested_follow_ups": ["要再看一題嗎？"],
                }
        self._write(
            200,
            {
                "id": "chatcmpl-mock",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": payload["model"],
                "choices": [
                    {
                        "index": 0,
                        "message": {
                            "role": "assistant",
                            "content": json.dumps(content, ensure_ascii=False),
                            "refusal": None,
                        },
                        "finish_reason": "stop",
                    }
                ],
                "usage": {
                    "prompt_tokens": 10,
                    "completion_tokens": 10,
                    "total_tokens": 20,
                },
            },
        )


class AgentLiveProviderIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        environment = patch.dict(
            os.environ, {"ANONYMIZED_TELEMETRY": "False"}, clear=True
        )
        environment.start()
        self.addCleanup(environment.stop)
        self.temporary_directory = tempfile.TemporaryDirectory(
            prefix="futureai-agent-live-test-"
        )
        self.data_dir = Path(self.temporary_directory.name)
        scenarios = json.loads(
            (Path(__file__).parents[1] / "data/curriculum/scenarios.json").read_text(
                encoding="utf-8"
            )
        )
        newton = next(item for item in scenarios if item["topic"] == "newton")
        self.provider_state = MockProviderState(newton["answer_payload"])
        self.provider = ThreadingHTTPServer(("127.0.0.1", 0), MockProviderHandler)
        self.provider.state = self.provider_state
        self.provider_thread = threading.Thread(
            target=self.provider.serve_forever, daemon=True
        )
        self.provider_thread.start()
        self.code = secrets.token_urlsafe(32)
        self.settings = Settings(
            _env_file=None,
            app_env="test",
            runtime_mode="live",
            data_dir=self.data_dir,
            chroma_path=self.data_dir / "chroma",
            database_url=f"sqlite:///{self.data_dir / 'app.db'}",
            demo_access_codes={"student_demo": self.code},
            llm_base_url=f"http://127.0.0.1:{self.provider.server_port}/v1",
            llm_api_key="mock-api-key",
            llm_model="mock-chat-model",
            embedding_model="mock-embedding-model",
            agent_deadline_seconds=1.0,
        )
        database = Database(self.settings)
        seed_database(database, datetime.now(timezone.utc).date())
        database.dispose()
        self.assertEqual(
            asyncio.run(build_index(self.settings)),
            {"curriculum": 18, "policy": 12},
        )
        self.client_context = TestClient(create_app(self.settings))
        self.client = self.client_context.__enter__()
        exchange = self.client.post(
            "/api/v1/auth/demo/session", json={"access_code": self.code}
        )
        self.assertEqual(exchange.status_code, 200, exchange.text)
        self.headers = {"Authorization": f"Bearer {exchange.json()['access_token']}"}

    def tearDown(self) -> None:
        self.client_context.__exit__(None, None, None)
        self.provider.shutdown()
        self.provider.server_close()
        self.provider_thread.join(timeout=3)
        self.temporary_directory.cleanup()

    def _body(self, message: str, **overrides: Any) -> dict[str, Any]:
        body: dict[str, Any] = {
            "user_id": "demo_student_01",
            "conversation_id": None,
            "mode": "learning",
            "message": message,
            "attachment_ids": [],
            "category": None,
            "topic": "newton",
        }
        body.update(overrides)
        return body

    def _post(self, key: str, body: dict[str, Any]):
        return self.client.post(
            "/api/v1/agent/chat",
            headers={**self.headers, "Idempotency-Key": key},
            json=body,
        )

    def _usage(self) -> dict[str, Any]:
        return self.client.get("/api/v1/usage", headers=self.headers).json()

    def test_live_structured_multimodal_embedding_and_no_explicit_intent_call(
        self,
    ) -> None:
        upload = self.client.post(
            "/api/v1/uploads",
            headers=self.headers,
            files={"file": ("diagram.png", _png_bytes(), "image/png")},
        )
        self.assertEqual(upload.status_code, 201, upload.text)
        before = len(self.provider_state.requests)
        response = self._post(
            "live-image",
            self._body(
                "請根據圖片與教材解釋牛頓",
                attachment_ids=[upload.json()["attachment_id"]],
            ),
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertFalse(response.json()["demo"])
        requests = self.provider_state.requests[before:]
        chat_requests = [
            body for path, body in requests if path.endswith("/chat/completions")
        ]
        embedding_requests = [
            body for path, body in requests if path.endswith("/embeddings")
        ]
        self.assertEqual(len(chat_requests), 1)
        self.assertEqual(
            chat_requests[0]["response_format"]["json_schema"]["name"],
            "LiveLearningGeneration",
        )
        schema_objects: list[dict[str, Any]] = []

        def collect_objects(value: Any) -> None:
            if isinstance(value, dict):
                if value.get("type") == "object":
                    schema_objects.append(value)
                for nested in value.values():
                    collect_objects(nested)
            elif isinstance(value, list):
                for nested in value:
                    collect_objects(nested)

        collect_objects(chat_requests[0]["response_format"]["json_schema"]["schema"])
        self.assertEqual(len(schema_objects), 5)
        for schema_object in schema_objects:
            self.assertIs(schema_object["additionalProperties"], False)
            self.assertEqual(
                set(schema_object["required"]), set(schema_object["properties"])
            )
        self.assertTrue(embedding_requests)
        user_content = chat_requests[0]["messages"][-1]["content"]
        image_parts = [item for item in user_content if item["type"] == "image_url"]
        self.assertEqual(len(image_parts), 1)
        self.assertTrue(
            image_parts[0]["image_url"]["url"].startswith("data:image/png;base64,")
        )

        resource = self._post(
            "live-resource",
            self._body(
                "家裡務農，想查農損資源",
                mode="resource",
                topic=None,
                category="agriculture",
            ),
        )
        self.assertEqual(resource.status_code, 200, resource.text)
        self.assertEqual(
            resource.json()["resource_recommendation"]["program_id"],
            "demo-agriculture-disaster-aid",
        )
        self.assertFalse(resource.json()["demo"])
        resource_summary = resource.json()["resource_recommendation"]["summary"]

        before_follow_up = len(self.provider_state.requests)
        resource_follow_up = self._post(
            "live-resource-follow-up",
            self._body(
                "需要準備哪些資料？",
                conversation_id=resource.json()["conversation_id"],
                mode="auto",
                topic=None,
                category=None,
            ),
        )
        self.assertEqual(resource_follow_up.status_code, 200, resource_follow_up.text)
        self.assertNotEqual(resource_follow_up.json()["text"], resource_summary)
        self.assertIn("身分證明", resource_follow_up.json()["text"])
        follow_up_generation = next(
            body
            for path, body in self.provider_state.requests[before_follow_up:]
            if path.endswith("/chat/completions")
        )
        envelope = json.loads(
            follow_up_generation["messages"][-1]["content"][0]["text"]
        )
        selected_context = next(
            item
            for item in envelope["candidate_programs"]
            if item["program_id"] == "demo-agriculture-disaster-aid"
        )
        self.assertIn("next_step", selected_context)
        self.assertIn("deadline", selected_context)
        self.assertIn("application_window", selected_context)
        self.assertTrue(selected_context["sources"][0]["excerpt"])

        resource_deadline = self._post(
            "live-resource-deadline",
            self._body(
                "申請期限到什麼時候？",
                conversation_id=resource.json()["conversation_id"],
                mode="auto",
                topic=None,
                category=None,
            ),
        )
        self.assertEqual(resource_deadline.status_code, 200, resource_deadline.text)
        self.assertIn("沒有可確認的截止日期", resource_deadline.json()["text"])

        health = self._post(
            "live-health",
            self._body(
                "最近壓力很大，想找健康資源聊聊",
                mode="resource",
                topic=None,
                category="health",
            ),
        )
        self.assertEqual(health.status_code, 200, health.text)
        health_next_step = self._post(
            "live-health-next-step",
            self._body(
                "要怎麼預約下一步？",
                conversation_id=health.json()["conversation_id"],
                mode="auto",
                topic=None,
                category=None,
            ),
        )
        self.assertEqual(health_next_step.status_code, 200, health_next_step.text)
        self.assertEqual(
            health_next_step.json()["text"],
            health_next_step.json()["resource_recommendation"]["next_step"],
        )

        economy = self._post(
            "live-economy",
            self._body(
                "爸爸最近失業，家裡生活費不足，需要經濟協助",
                mode="resource",
                topic=None,
                category="economy",
            ),
        )
        self.assertEqual(economy.status_code, 200, economy.text)
        economy_duration = self._post(
            "live-economy-duration",
            self._body(
                "多久可以得到協助？",
                conversation_id=economy.json()["conversation_id"],
                mode="auto",
                topic=None,
                category=None,
            ),
        )
        self.assertEqual(economy_duration.status_code, 200, economy_duration.text)
        self.assertIn("沒有可確認的辦理或審查時間", economy_duration.json()["text"])

        before_auto = len(self.provider_state.requests)
        auto = self._post(
            "live-auto-intent",
            self._body(
                "我不知道這該走哪一類，請判斷",
                mode="auto",
                topic=None,
                category=None,
            ),
        )
        self.assertEqual(auto.status_code, 200, auto.text)
        auto_chat = [
            body
            for path, body in self.provider_state.requests[before_auto:]
            if path.endswith("/chat/completions")
        ]
        self.assertEqual(
            [item["response_format"]["json_schema"]["name"] for item in auto_chat],
            ["IntentDecision", "LiveResourceGeneration"],
        )
        schemas_by_name = {
            body["response_format"]["json_schema"]["name"]: body["response_format"][
                "json_schema"
            ]["schema"]
            for path, body in self.provider_state.requests
            if path.endswith("/chat/completions")
        }
        all_schema_objects: list[dict[str, Any]] = []

        def collect_unique_objects(value: Any) -> None:
            if isinstance(value, dict):
                if value.get("type") == "object":
                    all_schema_objects.append(value)
                for nested in value.values():
                    collect_unique_objects(nested)
            elif isinstance(value, list):
                for nested in value:
                    collect_unique_objects(nested)

        for schema in schemas_by_name.values():
            collect_unique_objects(schema)
        self.assertEqual(
            set(schemas_by_name),
            {
                "IntentDecision",
                "LiveLearningGeneration",
                "LiveResourceGeneration",
            },
        )
        self.assertEqual(len(all_schema_objects), 7)
        for schema_object in all_schema_objects:
            self.assertIs(schema_object["additionalProperties"], False)
            self.assertEqual(
                set(schema_object["required"]), set(schema_object["properties"])
            )

    def test_async_provider_clients_close_after_success_failure_cancel_and_index(
        self,
    ) -> None:
        clients: list[RealAsyncOpenAI] = []

        def make_client(*args: Any, **kwargs: Any) -> RealAsyncOpenAI:
            client = RealAsyncOpenAI(*args, **kwargs)
            clients.append(client)
            return client

        with patch("app.llm.client.AsyncOpenAI", side_effect=make_client):
            initial = self._post(
                "lifecycle-initial",
                self._body(
                    "家裡務農，想查農損資源",
                    mode="resource",
                    topic=None,
                    category="agriculture",
                ),
            )
            self.assertEqual(initial.status_code, 200, initial.text)
            follow_up = self._post(
                "lifecycle-follow-up",
                self._body(
                    "需要準備哪些資料？",
                    conversation_id=initial.json()["conversation_id"],
                    mode="auto",
                    topic=None,
                    category=None,
                ),
            )
            self.assertEqual(follow_up.status_code, 200, follow_up.text)
            provider_error = self._post(
                "lifecycle-error",
                self._body(
                    "provider-error 農業資源",
                    mode="resource",
                    topic=None,
                    category="agriculture",
                ),
            )
            self.assertEqual(provider_error.status_code, 502, provider_error.text)
            cancelled = self._post(
                "lifecycle-cancel",
                self._body(
                    "slow-provider 農業資源",
                    mode="resource",
                    topic=None,
                    category="agriculture",
                ),
            )
            self.assertEqual(cancelled.status_code, 504, cancelled.text)
        self.assertEqual(len(clients), 4)
        self.assertTrue(all(client.is_closed() for client in clients))

        index_settings = Settings(
            _env_file=None,
            app_env="test",
            runtime_mode="live",
            data_dir=self.data_dir,
            chroma_path=self.data_dir / "lifecycle-index",
            database_url=self.settings.database_url,
            llm_base_url=self.settings.llm_base_url,
            llm_api_key="mock-api-key",
            llm_model="mock-chat-model",
            embedding_model="mock-embedding-model",
            agent_deadline_seconds=1.0,
        )
        index_clients: list[RealAsyncOpenAI] = []

        def make_index_client(*args: Any, **kwargs: Any) -> RealAsyncOpenAI:
            client = RealAsyncOpenAI(*args, **kwargs)
            index_clients.append(client)
            return client

        with patch("app.llm.client.AsyncOpenAI", side_effect=make_index_client):
            counts = asyncio.run(build_index(index_settings))
        self.assertEqual(counts, {"curriculum": 18, "policy": 12})
        self.assertEqual(len(index_clients), 1)
        self.assertTrue(index_clients[0].is_closed())

    def test_live_invalid_error_timeout_never_fall_back_and_refund(self) -> None:
        used_before = self._usage()["used"]
        cases = [
            ("invalid-live", "invalid-source 牛頓", 502, "PROVIDER_ERROR"),
            (
                "invalid-practice-live",
                "invalid-practice 牛頓",
                502,
                "PROVIDER_ERROR",
            ),
            (
                "incompatible-live",
                "incompatible-payload 牛頓",
                502,
                "PROVIDER_ERROR",
            ),
            ("error-live", "provider-error 牛頓", 502, "PROVIDER_UNAVAILABLE"),
            ("timeout-live", "slow-provider 牛頓", 504, "REQUEST_TIMEOUT"),
        ]
        for key, message, status, code in cases:
            response = self._post(key, self._body(message))
            self.assertEqual(response.status_code, status, response.text)
            self.assertEqual(response.json()["error"]["code"], code)
            self.assertNotIn("demo", response.json())
            self.assertNotIn("mock-api-key", response.text)
            self.assertNotIn(self.settings.llm_base_url, response.text)
        health = self.client.get("/health")
        self.assertEqual(health.status_code, 200, health.text)
        self.assertNotIn("mock-api-key", health.text)
        self.assertNotIn(self.settings.llm_base_url, health.text)
        usage = self._usage()
        self.assertEqual(usage["used"], used_before)
        self.assertEqual(usage["reserved"], 0)
        with self.client.app.state.database.session_factory() as db:
            persisted_assistant = db.scalar(
                select(func.count(Message.id)).where(
                    Message.role == "assistant",
                    Message.text == "這是 mock live provider 的結構化回答。",
                )
            )
            self.assertEqual(persisted_assistant, 0)
            failed = list(
                db.scalars(
                    select(IdempotencyRecord).where(
                        IdempotencyRecord.idempotency_key.in_(
                            [item[0] for item in cases]
                        )
                    )
                )
            )
            self.assertEqual(len(failed), len(cases))
            self.assertTrue(
                all(item.status == IdempotencyStatus.FAILED for item in failed)
            )
