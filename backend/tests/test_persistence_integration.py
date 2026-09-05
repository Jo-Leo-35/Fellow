from __future__ import annotations

import asyncio
import io
import os
import secrets
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from app.core.config import Settings
from app.db.database import Database
from app.db.models import (
    Conversation,
    InsightEvent,
    LearningActivity,
    Message,
    RosterStudent,
)
from app.main import create_app
from app.rag.indexer import build_index
from fastapi.testclient import TestClient
from PIL import Image
from scripts.seed import seed_database
from sqlalchemy import select, text


class PersistenceIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        environment = patch.dict(
            os.environ, {"ANONYMIZED_TELEMETRY": "False"}, clear=True
        )
        environment.start()
        self.addCleanup(environment.stop)
        directory = tempfile.TemporaryDirectory(prefix="futureai-persistence-test-")
        self.addCleanup(directory.cleanup)
        root = Path(directory.name)
        self.codes = {
            f"{role}_demo": secrets.token_urlsafe(32)
            for role in ("student", "teacher", "government")
        }
        self.settings = Settings(
            _env_file=None,
            app_env="test",
            runtime_mode="offline_demo",
            data_dir=root,
            chroma_path=root / "chroma",
            database_url=f"sqlite:///{root / 'app.db'}",
            demo_access_codes=self.codes,
        )
        self.database = Database(self.settings)
        self.addCleanup(self.database.dispose)
        self.anchor = datetime.now(timezone.utc).date()
        self.counts = seed_database(self.database, self.anchor)

    def snapshot(self) -> dict:
        """Compare every stored value without writing or exposing token hashes."""
        with self.database.engine.connect() as connection:
            names = connection.execute(
                text(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
                )
            ).scalars()
            return {
                name: sorted(
                    tuple(row)
                    for row in connection.execute(text(f'SELECT * FROM "{name}"'))
                )
                for name in names
            }

    def test_seed_minimums_and_linked_insight_provenance(self) -> None:
        for name, minimum in {
            "policy_programs": 10,
            "alerts": 3,
            "learning_activities": 20,
            "insight_events": 30,
            "conversations": 5,
            "roster_students": 42,
        }.items():
            self.assertGreaterEqual(self.counts[name], minimum, name)
        with self.database.session_factory() as db:
            linked = list(
                db.scalars(
                    select(InsightEvent).where(InsightEvent.message_id.is_not(None))
                )
            )
            self.assertGreaterEqual(len(linked), 8)
            self.assertEqual(len({item.message_id for item in linked}), len(linked))
            for insight in linked:
                message = db.get(Message, insight.message_id)
                conversation = db.get(Conversation, message.conversation_id)
                self.assertEqual(message.role, "assistant")
                self.assertEqual(insight.user_id, conversation.user_id)
                self.assertEqual(insight.occurred_at, message.created_at)
                self.assertEqual(insight.source_kind, "assistant_message")
                self.assertEqual(insight.source_reference, message.id)
                payload = message.structured_response
                if payload.get("learning_answer"):
                    self.assertEqual(
                        insight.learning_topic,
                        payload["learning_answer"]["scenario_id"],
                    )
                    self.assertIsNone(insight.resource_category)
                    activity = db.get(LearningActivity, insight.learning_activity_id)
                    self.assertEqual(activity.message_id, message.id)
                    self.assertEqual(activity.topic, insight.learning_topic)
                    self.assertEqual(activity.occurred_at, message.created_at)
                    self.assertIsNone(activity.practice_correct)
                    self.assertIsNone(activity.animation_completed)
                else:
                    self.assertEqual(
                        insight.resource_category,
                        payload["resource_recommendation"]["category"],
                    )
                    self.assertIsNone(insight.learning_topic)
            observations = list(
                db.scalars(
                    select(InsightEvent).where(InsightEvent.message_id.is_(None))
                )
            )
            self.assertTrue(observations)
            for observation in observations:
                self.assertTrue(observation.source_reference)
                self.assertNotEqual(observation.source_kind, "assistant_message")
                if observation.learning_activity_id:
                    activity = db.get(
                        LearningActivity, observation.learning_activity_id
                    )
                    roster = db.get(RosterStudent, activity.roster_student_id)
                    self.assertEqual(observation.user_id, roster.user_id)
                    self.assertEqual(observation.occurred_at, activity.occurred_at)
                    self.assertEqual(observation.source_reference, activity.id)
                else:
                    self.assertEqual(
                        observation.source_kind, "authored_resource_observation"
                    )
        before = self.snapshot()
        seed_database(self.database, self.anchor + timedelta(days=60))
        self.assertTrue(
            self.snapshot() == before,
            "Seed is repeatable and preserves the first dataset anchor",
        )

    def test_api_mutations_reseed_and_fresh_app_preserve_all_state(self) -> None:
        asyncio.run(build_index(self.settings))
        profile_path = "/api/v1/profile/demo_student_01"
        sessions = {}
        with TestClient(create_app(self.settings)) as client:
            for role, code in self.codes.items():
                response = client.post(
                    "/api/v1/auth/demo/session", json={"access_code": code}
                )
                self.assertEqual(response.status_code, 200)
                sessions[role] = {
                    "Authorization": f"Bearer {response.json()['access_token']}"
                }
            student = sessions["student_demo"]
            replacement = {
                "nickname": "持久化驗收",
                "grade": 9,
                "region": "高雄市甲仙區",
                "family_occupation": None,
                "family_type": "驗收家庭型態",
                "economic_status": None,
                "other_identities": ["驗收學生"],
            }
            self.assertEqual(
                client.put(profile_path, headers=student, json=replacement).status_code,
                200,
            )
            self.assertEqual(
                client.delete(
                    profile_path + "/memory/family_occupation", headers=student
                ).status_code,
                204,
            )
            self.assertEqual(
                client.delete(
                    "/api/v1/conversations/demo-conv-agriculture", headers=student
                ).status_code,
                204,
            )
            image = io.BytesIO()
            Image.new("RGB", (4, 4), color=(20, 80, 140)).save(image, format="PNG")
            upload = client.post(
                "/api/v1/uploads",
                headers=student,
                files={"file": ("question.png", image.getvalue(), "image/png")},
            )
            self.assertEqual(upload.status_code, 201)
            attachment = upload.json()
            question = {
                "user_id": "demo_student_01",
                "conversation_id": None,
                "mode": "learning",
                "message": "請解釋牛頓第二定律",
                "topic": "newton",
                "attachment_ids": [attachment["attachment_id"]],
            }
            learning = client.post(
                "/api/v1/agent/chat",
                headers={**student, "Idempotency-Key": "persistent-learning"},
                json=question,
            )
            self.assertEqual(learning.status_code, 200)
            resource = client.post(
                "/api/v1/agent/chat",
                headers={**student, "Idempotency-Key": "persistent-resource"},
                json={
                    "user_id": "demo_student_01",
                    "conversation_id": None,
                    "mode": "resource",
                    "category": "agriculture",
                    "message": "家裡務農，颱風後農損想找補助",
                    "attachment_ids": [],
                },
            )
            self.assertEqual(resource.status_code, 200)
            suggestion_id = resource.json()["memory_suggestion"]["suggestion_id"]
            for consent in (False, 1, 1.0):
                rejected = client.post(
                    profile_path + "/memory",
                    headers=student,
                    json={"suggestion_id": suggestion_id, "consent": consent},
                )
                self.assertEqual(rejected.status_code, 422)
                self.assertFalse(
                    client.get(profile_path, headers=student).json()["memories"]
                )
            consent_body = {"suggestion_id": suggestion_id, "consent": True}
            self.assertEqual(
                client.post(
                    profile_path + "/memory", headers=student, json=consent_body
                ).status_code,
                201,
            )
            alerts_response = client.get(
                "/api/v1/alerts?user_id=demo_student_01", headers=student
            )
            self.assertEqual(alerts_response.status_code, 200)
            alerts = alerts_response.json()
            unread = next(item for item in alerts["items"] if item["read_at"] is None)
            self.assertEqual(
                client.post(
                    f"/api/v1/alerts/{unread['alert_id']}/read", headers=student
                ).status_code,
                200,
            )
            paths = [
                profile_path,
                "/api/v1/alerts?user_id=demo_student_01",
                "/api/v1/conversations?user_id=demo_student_01",
                "/api/v1/usage",
                "/api/v1/auth/session",
                f"/api/v1/conversations/{learning.json()['conversation_id']}",
                f"/api/v1/conversations/{resource.json()['conversation_id']}",
            ]
            persisted = {
                path: client.get(path, headers=student).json() for path in paths
            }
            dashboards = {
                role: client.get(
                    f"/api/v1/dashboard/{role}", headers=sessions[f"{role}_demo"]
                ).json()
                for role in ("teacher", "government")
            }
            self.assertEqual(persisted["/api/v1/usage"]["used"], 2)
            self.assertEqual(persisted["/api/v1/usage"]["reserved"], 0)
        before_seed = self.snapshot()
        for offset in (1, 60):
            seed_database(self.database, self.anchor + timedelta(days=offset))
            self.assertTrue(
                self.snapshot() == before_seed,
                "Rerun must not mutate sessions, quota, profiles, reads, history, or deleted rows",
            )
        self.assertEqual(
            asyncio.run(build_index(self.settings)), {"curriculum": 18, "policy": 12}
        )
        with TestClient(create_app(self.settings)) as client:
            for path, expected in persisted.items():
                response = client.get(path, headers=student)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), expected, path)
            for role, expected in dashboards.items():
                self.assertEqual(
                    client.get(
                        f"/api/v1/dashboard/{role}", headers=sessions[f"{role}_demo"]
                    ).json(),
                    expected,
                )
            self.assertEqual(
                client.get(attachment["download_url"], headers=student).content,
                image.getvalue(),
            )
            self.assertEqual(
                client.get(
                    "/api/v1/conversations/demo-conv-agriculture", headers=student
                ).status_code,
                404,
            )
            replay = client.post(
                "/api/v1/chat",
                headers={**student, "Idempotency-Key": "persistent-learning"},
                json=question,
            )
            self.assertEqual(replay.status_code, 200)
            self.assertEqual(replay.json()["message_id"], learning.json()["message_id"])
            self.assertEqual(
                client.get("/api/v1/usage", headers=student).json(),
                persisted["/api/v1/usage"],
            )
            self.assertEqual(
                client.post(
                    profile_path + "/memory", headers=student, json=consent_body
                ).status_code,
                200,
            )
            self.assertEqual(
                client.delete(
                    profile_path + "/memory/family_occupation", headers=student
                ).status_code,
                204,
            )
            self.assertEqual(
                client.delete(
                    f"/api/v1/conversations/{resource.json()['conversation_id']}",
                    headers=student,
                ).status_code,
                204,
            )
        deleted = self.snapshot()
        seed_database(self.database, self.anchor + timedelta(days=90))
        self.assertTrue(
            self.snapshot() == deleted,
            "Deleted memory and conversation must not be resurrected",
        )
