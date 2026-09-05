from __future__ import annotations

import asyncio
import hashlib
import io
import os
import secrets
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from unittest.mock import patch

from app.core.config import Settings
from app.db.database import Database
from app.db.models import (
    AuthSession,
    Conversation,
    DemoPrincipal,
    InsightEvent,
    LearningActivity,
    MemorySuggestion,
    Message,
    ProfileMemory,
    QuotaLedger,
    TeacherClass,
    UploadedFile,
    User,
)
from app.main import create_app
from app.rag.indexer import build_index
from app.schemas.enums import EligibilityStatus, InsightType, ResourceCategory
from app.services.common import ALLOWED_REGIONS
from app.services.insights import (
    learning_gap_projection,
    record_learning_question,
    record_primary_insight,
    resource_projection,
)
from app.services.uploads import cleanup_expired_unattached_uploads
from fastapi.testclient import TestClient
from PIL import Image
from scripts.seed import seed_database
from sqlalchemy import event, func, select


class CoreApiIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        environment = patch.dict(
            os.environ, {"ANONYMIZED_TELEMETRY": "False"}, clear=True
        )
        environment.start()
        self.addCleanup(environment.stop)
        self.temporary_directory = tempfile.TemporaryDirectory(
            prefix="futureai-core-api-test-"
        )
        self.data_dir = Path(self.temporary_directory.name)
        self.database_url = f"sqlite:///{self.data_dir / 'app.db'}"
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
            database_url=self.database_url,
            demo_access_codes=self.codes,
        )
        database = Database(self.settings)
        seed_database(database, datetime.now(timezone.utc).date())
        now = datetime.now(timezone.utc)
        with database.session_factory() as db, db.begin():
            db.add(
                DemoPrincipal(
                    id="test-principal-second-student",
                    config_key="second_student",
                    user_id="demo_student_02",
                    daily_quota_limit=5,
                    enabled=True,
                )
            )
            db.add_all(
                [
                    MemorySuggestion(
                        id="test-pending-memory",
                        user_id="demo_student_01",
                        conversation_id="demo-conv-agriculture",
                        source_message_id="demo-conv-agriculture-assistant",
                        memory_key="family_occupation",
                        value="farmer",
                        display_value="家裡從事農業",
                        reason="測試明確同意流程。",
                        status="pending",
                        expires_at=now + timedelta(hours=1),
                        created_at=now,
                    ),
                    MemorySuggestion(
                        id="test-expired-memory",
                        user_id="demo_student_01",
                        conversation_id=None,
                        source_message_id=None,
                        memory_key="family_type",
                        value="extended",
                        display_value="三代同堂",
                        reason=None,
                        status="pending",
                        expires_at=now - timedelta(seconds=1),
                        created_at=now - timedelta(hours=2),
                    ),
                    MemorySuggestion(
                        id="test-foreign-memory",
                        user_id="demo_student_02",
                        conversation_id=None,
                        source_message_id=None,
                        memory_key="economic_status",
                        value="needs_support",
                        display_value="需要經濟支持",
                        reason=None,
                        status="pending",
                        expires_at=now + timedelta(hours=1),
                        created_at=now,
                    ),
                ]
            )
        database.dispose()
        self.assertEqual(
            asyncio.run(build_index(self.settings)),
            {"curriculum": 18, "policy": 12},
        )
        self.client_context = TestClient(create_app(self.settings))
        self.client = self.client_context.__enter__()
        self.student_headers = self._exchange("student_demo")
        self.second_student_headers = self._exchange("second_student")
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

    def assert_error(self, response: Any, status: int, code: str) -> None:
        self.assertEqual(response.status_code, status, response.text)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], code)
        self.assertTrue(payload["error"]["request_id"])
        self.assertEqual(payload["error"]["runtime_mode"], "offline_demo")

    def test_offline_demo_creates_role_sessions_without_access_codes(self) -> None:
        for role in ("student", "teacher", "government"):
            with self.subTest(role=role):
                response = self.client.post(
                    "/api/v1/auth/demo/session", json={"role": role}
                )
                self.assertEqual(response.status_code, 200, response.text)
                payload = response.json()
                self.assertEqual(payload["runtime_mode"], "offline_demo")
                self.assertEqual(payload["session"]["role"], role)
                self.assertTrue(payload["access_token"])
        self.assertEqual(
            self.client.post("/api/v1/auth/demo/session", json={}).status_code,
            422,
        )

    def test_openapi_bearer_keeps_public_routes_and_auth_errors(self) -> None:
        schema_response = self.client.get("/openapi.json")
        self.assertEqual(schema_response.status_code, 200)
        schema = schema_response.json()
        bearer = schema["components"]["securitySchemes"]["DemoBearer"]
        self.assertEqual(bearer["type"], "http")
        self.assertEqual(bearer["scheme"], "bearer")
        for path, operations in schema["paths"].items():
            for method, operation in operations.items():
                if method not in {"get", "post", "put", "delete", "patch"}:
                    continue
                with self.subTest(path=path, method=method):
                    if path in {"/health", "/api/v1/auth/demo/session"}:
                        self.assertFalse(operation.get("security"))
                    else:
                        self.assertEqual(operation["security"], [{"DemoBearer": []}])

        for authorization in (None, "Basic invalid", "Bearer", "Bearer invalid"):
            headers = {"Authorization": authorization} if authorization else {}
            with self.subTest(authorization=authorization):
                response = self.client.get("/api/v1/auth/session", headers=headers)
                self.assert_error(response, 401, "UNAUTHORIZED")
                self.assertEqual(response.headers["www-authenticate"], "Bearer")
        self.assertEqual(
            self.client.get(
                "/api/v1/auth/session", headers=self.student_headers
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.get(
                "/health", headers={"Authorization": "Basic invalid"}
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/demo/session",
                headers={"Authorization": "Basic invalid"},
                json={"access_code": self.codes["student_demo"]},
            ).status_code,
            200,
        )

    def test_auth_session_and_persisted_usage_use_real_utc(self) -> None:
        self.assert_error(
            self.client.get("/api/v1/profile/demo_student_01"), 401, "UNAUTHORIZED"
        )
        self.assert_error(
            self.client.post(
                "/api/v1/auth/demo/session",
                json={"access_code": f"錯誤-{secrets.token_urlsafe(16)}"},
            ),
            401,
            "INVALID_ACCESS_CODE",
        )
        no_secret_settings = Settings(
            _env_file=None,
            app_env="test",
            data_dir=self.data_dir,
            chroma_path=self.data_dir / "chroma",
            database_url=self.database_url,
            demo_access_codes={},
        )
        with (
            self.assertRaisesRegex(RuntimeError, "DEMO_ACCESS_CODES"),
            TestClient(create_app(no_secret_settings)),
        ):
            pass
        missing_index_settings = Settings(
            _env_file=None,
            app_env="test",
            runtime_mode="offline_demo",
            data_dir=self.data_dir,
            chroma_path=self.data_dir / "missing-index",
            database_url=self.database_url,
            demo_access_codes=self.codes,
        )
        with (
            self.assertRaisesRegex(RuntimeError, "retrieval index"),
            TestClient(create_app(missing_index_settings)),
        ):
            pass
        with self.assertRaisesRegex(ValueError, "live runtime configuration"):
            Settings(
                _env_file=None,
                app_env="test",
                runtime_mode="live",
                data_dir=self.data_dir,
                chroma_path=self.data_dir / "unused-live-index",
                database_url=self.database_url,
                demo_access_codes=self.codes,
            )

        session = self.client.get("/api/v1/auth/session", headers=self.student_headers)
        self.assertEqual(session.status_code, 200, session.text)
        self.assertEqual(session.json()["session"]["role"], "student")
        expires = datetime.fromisoformat(session.json()["expires_at"])
        now = datetime.now(timezone.utc)
        self.assertGreater(expires, now)
        self.assertLessEqual(expires, now + timedelta(hours=8, seconds=5))

        usage = self.client.get("/api/v1/usage", headers=self.student_headers)
        self.assertEqual(usage.status_code, 200, usage.text)
        self.assertEqual(usage.json()["limit"], 20)
        with self.client.app.state.database.session_factory() as db, db.begin():
            ledger = db.scalar(
                select(QuotaLedger).where(
                    QuotaLedger.principal_id == "demo-principal-student"
                )
            )
            self.assertIsNotNone(ledger)
            ledger.used_count = 3
            ledger.reserved_count = 2
        usage = self.client.get("/api/v1/usage", headers=self.student_headers)
        self.assertEqual(
            {key: usage.json()[key] for key in ("used", "reserved", "remaining")},
            {"used": 3, "reserved": 2, "remaining": 15},
        )
        reset_at = datetime.fromisoformat(usage.json()["reset_at"])
        self.assertEqual(reset_at.date(), (now + timedelta(days=1)).date())
        self.assertEqual(reset_at.hour, 0)

        token = self.student_headers["Authorization"].removeprefix("Bearer ")
        with self.client.app.state.database.session_factory() as db:
            session_row = db.scalar(
                select(AuthSession).where(
                    AuthSession.principal_id == "demo-principal-student"
                )
            )
            self.assertIsNotNone(session_row)
            self.assertNotEqual(session_row.token_hash, token)

        relogin = self.client.post(
            "/api/v1/auth/demo/session",
            json={"access_code": self.codes["student_demo"]},
        )
        self.assertEqual(relogin.status_code, 200, relogin.text)
        relogin_headers = {"Authorization": f"Bearer {relogin.json()['access_token']}"}
        self.assertEqual(
            self.client.get("/api/v1/usage", headers=relogin_headers).json()["used"],
            3,
        )
        self.assertEqual(
            self._exchange("teacher_demo")["Authorization"].split(" ", 1)[0],
            "Bearer",
        )
        returned_student = self._exchange("student_demo")
        self.assertEqual(
            self.client.get("/api/v1/usage", headers=returned_student).json()["used"],
            3,
        )

        relogin_hash = hashlib.sha256(
            relogin.json()["access_token"].encode("utf-8")
        ).hexdigest()
        with self.client.app.state.database.session_factory() as db, db.begin():
            relogin_row = db.scalar(
                select(AuthSession).where(AuthSession.token_hash == relogin_hash)
            )
            relogin_row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.assert_error(
            self.client.get("/api/v1/auth/session", headers=relogin_headers),
            401,
            "SESSION_EXPIRED",
        )

        self.settings.auth_exchange_rate_limit_requests = 8
        limited = self.client.post(
            "/api/v1/auth/demo/session",
            json={"access_code": self.codes["student_demo"]},
        )
        self.assert_error(limited, 429, "RATE_LIMITED")
        self.assertGreaterEqual(int(limited.headers["Retry-After"]), 1)
        self.assertEqual(
            limited.json()["error"]["details"]["retry_after_seconds"],
            int(limited.headers["Retry-After"]),
        )

    def test_profile_consent_retry_expiry_delete_and_matching(self) -> None:
        profile_path = "/api/v1/profile/demo_student_01"
        profile = self.client.get(profile_path, headers=self.student_headers)
        self.assertEqual(profile.status_code, 200, profile.text)
        update = self.client.put(
            profile_path,
            headers=self.student_headers,
            json={
                "nickname": "  小明新稱呼  ",
                "grade": 8,
                "region": " 高雄市美濃區 ",
                "family_occupation": None,
                "family_type": None,
                "economic_status": None,
                "other_identities": ["學生"],
            },
        )
        self.assertEqual(update.status_code, 200, update.text)
        self.assertEqual(update.json()["nickname"], "小明新稱呼")
        self.assertEqual(update.json()["region"], "高雄市美濃區")

        rejected_count = self._memory_count()
        self.assert_error(
            self.client.post(
                f"{profile_path}/memory",
                headers=self.student_headers,
                json={"suggestion_id": "test-pending-memory", "consent": False},
            ),
            422,
            "VALIDATION_ERROR",
        )
        self.assertEqual(self._memory_count(), rejected_count)
        self.assert_error(
            self.client.post(
                f"{profile_path}/memory",
                headers=self.student_headers,
                json={"suggestion_id": "test-expired-memory", "consent": True},
            ),
            409,
            "MEMORY_SUGGESTION_EXPIRED",
        )
        self.assert_error(
            self.client.post(
                f"{profile_path}/memory",
                headers=self.student_headers,
                json={"suggestion_id": "test-foreign-memory", "consent": True},
            ),
            403,
            "USER_SCOPE_FORBIDDEN",
        )

        accepted = self.client.post(
            f"{profile_path}/memory",
            headers=self.student_headers,
            json={"suggestion_id": "test-pending-memory", "consent": True},
        )
        self.assertEqual(accepted.status_code, 201, accepted.text)
        retried = self.client.post(
            f"{profile_path}/memory",
            headers=self.student_headers,
            json={"suggestion_id": "test-pending-memory", "consent": True},
        )
        self.assertEqual(retried.status_code, 200, retried.text)
        self.assertEqual(retried.json(), accepted.json())
        profile = self.client.get(profile_path, headers=self.student_headers).json()
        self.assertEqual(profile["family_occupation"], "farmer")
        recommended = self.client.get(
            "/api/v1/resources?category=agriculture&recommended_only=true",
            headers=self.student_headers,
        )
        self.assertGreater(len(recommended.json()["items"]), 0)

        deleted = self.client.delete(
            f"{profile_path}/memory/family_occupation",
            headers=self.student_headers,
        )
        self.assertEqual(deleted.status_code, 204, deleted.text)
        profile = self.client.get(profile_path, headers=self.student_headers).json()
        self.assertIsNone(profile["family_occupation"])
        self.assertFalse(
            any(item["key"] == "family_occupation" for item in profile["memories"])
        )
        recommended = self.client.get(
            "/api/v1/resources?category=agriculture&recommended_only=true",
            headers=self.student_headers,
        )
        self.assertEqual(recommended.json()["items"], [])

    def test_role_surface_cors_and_request_boundaries_are_fail_closed(self) -> None:
        for headers in (self.teacher_headers, self.government_headers):
            self.assertEqual(
                self.client.get("/api/v1/auth/session", headers=headers).status_code,
                200,
            )
            self.assertEqual(
                self.client.get("/api/v1/usage", headers=headers).status_code,
                200,
            )
        teacher_role_spoof = dict(self.teacher_headers)
        teacher_role_spoof.update(
            {"X-Role": "student", "Idempotency-Key": "role-header-cannot-escalate"}
        )
        self.assert_error(
            self.client.post(
                "/api/v1/agent/chat",
                headers=teacher_role_spoof,
                json={
                    "user_id": "demo_student_01",
                    "conversation_id": None,
                    "mode": "learning",
                    "message": "請解釋牛頓第二定律",
                    "attachment_ids": [],
                    "topic": "newton",
                },
            ),
            403,
            "FORBIDDEN",
        )
        government_chat_headers = dict(self.government_headers)
        government_chat_headers["Idempotency-Key"] = "government-alias-denied"
        self.assert_error(
            self.client.post(
                "/api/v1/chat",
                headers=government_chat_headers,
                json={
                    "user_id": "demo_student_01",
                    "conversation_id": None,
                    "mode": "learning",
                    "message": "請解釋牛頓第二定律",
                    "attachment_ids": [],
                    "topic": "newton",
                },
            ),
            403,
            "FORBIDDEN",
        )
        for path, headers in (
            ("/api/v1/profile/demo_student_01", self.teacher_headers),
            ("/api/v1/profile/demo_student_01", self.government_headers),
            (
                "/api/v1/conversations?user_id=demo_student_01",
                self.government_headers,
            ),
            (
                "/api/v1/conversations?user_id=demo_student_01",
                self.teacher_headers,
            ),
            ("/api/v1/resources", self.teacher_headers),
            ("/api/v1/resources", self.government_headers),
            (
                "/api/v1/alerts?user_id=demo_student_01",
                self.government_headers,
            ),
            (
                "/api/v1/alerts?user_id=demo_student_01",
                self.teacher_headers,
            ),
            ("/api/v1/learning/materials", self.government_headers),
            ("/api/v1/dashboard/teacher", self.student_headers),
            ("/api/v1/dashboard/teacher", self.government_headers),
            ("/api/v1/dashboard/government", self.student_headers),
        ):
            with self.subTest(path=path):
                self.assert_error(
                    self.client.get(path, headers=headers), 403, "FORBIDDEN"
                )

        self.assert_error(
            self.client.get(
                "/api/v1/profile/demo_student_02", headers=self.student_headers
            ),
            403,
            "USER_SCOPE_FORBIDDEN",
        )
        self.assert_error(
            self.client.get(
                "/api/v1/conversations?user_id=demo_student_02",
                headers=self.student_headers,
            ),
            403,
            "USER_SCOPE_FORBIDDEN",
        )
        self.assert_error(
            self.client.delete(
                "/api/v1/conversations/demo-conv-agriculture",
                headers=self.second_student_headers,
            ),
            403,
            "USER_SCOPE_FORBIDDEN",
        )
        self.assert_error(
            self.client.post(
                "/api/v1/alerts/demo-alert-agriculture/read",
                headers=self.teacher_headers,
            ),
            403,
            "FORBIDDEN",
        )
        self.assert_error(
            self.client.delete(
                "/api/v1/profile/demo_student_02/memory/family_occupation",
                headers=self.student_headers,
            ),
            403,
            "USER_SCOPE_FORBIDDEN",
        )

        uploaded = self.client.post(
            "/api/v1/uploads",
            headers=self.student_headers,
            files={"file": ("private.png", self._image_bytes("PNG"), "image/png")},
        )
        self.assertEqual(uploaded.status_code, 201, uploaded.text)
        for headers in (self.teacher_headers, self.government_headers):
            self.assert_error(
                self.client.get(uploaded.json()["download_url"], headers=headers),
                403,
                "FORBIDDEN",
            )
        self.assert_error(
            self.client.post(
                "/api/v1/uploads",
                headers=self.government_headers,
                files={
                    "file": ("forbidden.png", self._image_bytes("PNG"), "image/png")
                },
            ),
            403,
            "FORBIDDEN",
        )

        allowed_origin = "http://localhost:5173"
        preflight = self.client.options(
            "/api/v1/agent/chat",
            headers={
                "Origin": allowed_origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": (
                    "authorization,content-type,idempotency-key,x-request-id"
                ),
            },
        )
        self.assertEqual(preflight.status_code, 200, preflight.text)
        self.assertEqual(
            preflight.headers["access-control-allow-origin"], allowed_origin
        )
        allowed_headers = preflight.headers["access-control-allow-headers"].lower()
        for required in ("authorization", "content-type", "idempotency-key"):
            self.assertIn(required, allowed_headers)
        rejected_origin = self.client.options(
            "/api/v1/agent/chat",
            headers={
                "Origin": "https://evil.example",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,idempotency-key",
            },
        )
        self.assertNotIn("access-control-allow-origin", rejected_origin.headers)

        oversized = self.client.post(
            "/api/v1/auth/demo/session",
            content=b'{"access_code":"' + b"x" * (70 * 1024) + b'"}',
            headers={"Content-Type": "application/json"},
        )
        self.assert_error(oversized, 413, "VALIDATION_ERROR")
        malformed = self.client.post(
            "/api/v1/auth/demo/session",
            content=b'{"access_code":',
            headers={"Content-Type": "application/json"},
        )
        self.assert_error(malformed, 400, "VALIDATION_ERROR")
        long_path = self.client.get(
            "/api/v1/profile/" + "x" * 129,
            headers=self.student_headers,
        )
        self.assert_error(long_path, 422, "VALIDATION_ERROR")

    def _memory_count(self) -> int:
        with self.client.app.state.database.session_factory() as db:
            return int(db.scalar(select(func.count()).select_from(ProfileMemory)) or 0)

    def test_history_replays_snapshot_and_delete_preserves_evidence(self) -> None:
        first_page = self.client.get(
            "/api/v1/conversations?user_id=demo_student_01&limit=2",
            headers=self.student_headers,
        )
        self.assertEqual(first_page.status_code, 200, first_page.text)
        self.assertEqual(len(first_page.json()["items"]), 2)
        cursor = first_page.json()["next_cursor"]
        self.assertTrue(cursor)
        second_page = self.client.get(
            "/api/v1/conversations",
            headers=self.student_headers,
            params={"user_id": "demo_student_01", "limit": 2, "cursor": cursor},
        )
        self.assertEqual(second_page.status_code, 200, second_page.text)
        self.assertFalse(
            {item["conversation_id"] for item in first_page.json()["items"]}
            & {item["conversation_id"] for item in second_page.json()["items"]}
        )
        detail_path = "/api/v1/conversations/demo-conv-agriculture"
        first = self.client.get(detail_path, headers=self.student_headers)
        second = self.client.get(detail_path, headers=self.student_headers)
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(first.json(), second.json())
        assistant = first.json()["messages"][1]
        self.assertTrue(assistant["resource_recommendation"])
        self.assertEqual(
            assistant["sources"], assistant["resource_recommendation"]["sources"]
        )
        before = self._stable_evidence_counts()
        self.client.get(detail_path, headers=self.student_headers)
        self.assertEqual(self._stable_evidence_counts(), before)

        foreign = self.client.get(detail_path, headers=self.second_student_headers)
        self.assert_error(foreign, 403, "USER_SCOPE_FORBIDDEN")
        removed = self.client.delete(detail_path, headers=self.student_headers)
        self.assertEqual(removed.status_code, 204, removed.text)
        self.assert_error(
            self.client.get(detail_path, headers=self.student_headers),
            404,
            "CONVERSATION_NOT_FOUND",
        )
        self.assertEqual(self._stable_evidence_counts(), before)
        profile = self.client.get(
            "/api/v1/profile/demo_student_01", headers=self.student_headers
        ).json()
        memory = next(
            item for item in profile["memories"] if item["key"] == "family_occupation"
        )
        self.assertIsNone(memory["source_conversation_id"])

    def _stable_evidence_counts(self) -> tuple[int, int, int]:
        with self.client.app.state.database.session_factory() as db:
            return (
                int(db.scalar(select(func.count()).select_from(ProfileMemory)) or 0),
                int(db.scalar(select(func.count()).select_from(LearningActivity)) or 0),
                int(db.scalar(select(func.count()).select_from(InsightEvent)) or 0),
            )

    def test_resources_alerts_read_state_and_validation(self) -> None:
        eligibility_statuses = (
            None,
            EligibilityStatus.ELIGIBLE,
            EligibilityStatus.POSSIBLY_ELIGIBLE,
            EligibilityStatus.NEEDS_CONFIRMATION,
            EligibilityStatus.NOT_ELIGIBLE,
        )
        for event_type in (
            InsightType.RESOURCE_NEED,
            InsightType.RESOURCE_INTEREST,
        ):
            for eligibility_status in eligibility_statuses:
                with self.subTest(
                    event_type=event_type,
                    eligibility_status=eligibility_status,
                ):
                    projection = resource_projection(
                        event_type,
                        ResourceCategory.AGRICULTURE,
                        eligibility_status,
                    )
                    self.assertEqual(projection.event_type, event_type)
                    self.assertEqual(
                        projection.resource_category,
                        ResourceCategory.AGRICULTURE,
                    )
                    self.assertEqual(
                        projection.potential_need,
                        event_type == InsightType.RESOURCE_NEED
                        and eligibility_status
                        in {
                            EligibilityStatus.POSSIBLY_ELIGIBLE,
                            EligibilityStatus.NEEDS_CONFIRMATION,
                        },
                    )
                    self.assertEqual(
                        projection.resource_view,
                        event_type == InsightType.RESOURCE_INTEREST,
                    )

        resources = self.client.get("/api/v1/resources", headers=self.student_headers)
        self.assertEqual(resources.status_code, 200, resources.text)
        self.assertEqual(len(resources.json()["items"]), 12)
        self.assertTrue(
            all(
                item["eligibility_status"] != "eligible"
                for item in resources.json()["items"]
            )
        )
        detail = self.client.get(
            "/api/v1/resources/demo-agriculture-disaster-aid",
            headers=self.student_headers,
        )
        self.assertEqual(detail.status_code, 200, detail.text)
        self.assertIsNone(detail.json()["deadline"])
        self.assert_error(
            self.client.get(
                "/api/v1/resources?category=unknown", headers=self.student_headers
            ),
            422,
            "VALIDATION_ERROR",
        )
        materials = self.client.get(
            "/api/v1/learning/materials", headers=self.teacher_headers
        )
        self.assertEqual(materials.status_code, 200, materials.text)
        self.assertEqual(len(materials.json()["items"]), 18)

        alerts = self.client.get(
            "/api/v1/alerts?user_id=demo_student_01", headers=self.student_headers
        )
        self.assertEqual(alerts.status_code, 200, alerts.text)
        ids = {item["alert_id"] for item in alerts.json()["items"]}
        self.assertIn("demo-alert-agriculture", ids)
        read = self.client.post(
            "/api/v1/alerts/demo-alert-agriculture/read",
            headers=self.student_headers,
        )
        retried = self.client.post(
            "/api/v1/alerts/demo-alert-agriculture/read",
            headers=self.student_headers,
        )
        self.assertEqual(read.status_code, 200, read.text)
        self.assertEqual(read.json()["read_at"], retried.json()["read_at"])
        unread = self.client.get(
            "/api/v1/alerts?user_id=demo_student_01&unread_only=true",
            headers=self.student_headers,
        ).json()
        self.assertNotIn(
            "demo-alert-agriculture",
            {item["alert_id"] for item in unread["items"]},
        )
        self.assert_error(
            self.client.get(
                "/api/v1/alerts?user_id=demo_student_02",
                headers=self.student_headers,
            ),
            403,
            "USER_SCOPE_FORBIDDEN",
        )

    def test_upload_validation_private_content_and_safe_name(self) -> None:
        png = self._image_bytes("PNG")
        uploaded = self.client.post(
            "/api/v1/uploads",
            headers=self.student_headers,
            files={"file": ("../../evil.php", png, "image/png")},
        )
        self.assertEqual(uploaded.status_code, 201, uploaded.text)
        attachment = uploaded.json()
        self.assertEqual(attachment["filename"], "evil.png")
        self.assertNotIn(str(self.data_dir), uploaded.text)
        content = self.client.get(
            attachment["download_url"], headers=self.student_headers
        )
        self.assertEqual(content.status_code, 200, content.text)
        self.assertEqual(content.content, png)
        self.assertEqual(content.headers["cache-control"], "private, no-store")
        self.assert_error(
            self.client.get(
                attachment["download_url"], headers=self.second_student_headers
            ),
            403,
            "USER_SCOPE_FORBIDDEN",
        )

        jpeg = self._image_bytes("JPEG")
        self.assertEqual(
            self.client.post(
                "/api/v1/uploads",
                headers=self.student_headers,
                files={"file": ("photo.jpeg", jpeg, "image/jpeg")},
            ).status_code,
            201,
        )
        self.assert_error(
            self.client.post(
                "/api/v1/uploads",
                headers=self.student_headers,
                files={"file": ("fake.jpg", png, "image/jpeg")},
            ),
            415,
            "UNSUPPORTED_MEDIA_TYPE",
        )
        corrupt_png = b"\x89PNG\r\n\x1a\n" + b"not-a-decodable-image"
        self.assert_error(
            self.client.post(
                "/api/v1/uploads",
                headers=self.student_headers,
                files={"file": ("broken.png", corrupt_png, "image/png")},
            ),
            422,
            "UPLOAD_INVALID",
        )
        self.assert_error(
            self.client.post(
                "/api/v1/uploads",
                headers=self.student_headers,
                files={"file": ("huge.png", b"x" * (5 * 1024 * 1024 + 1), "image/png")},
            ),
            413,
            "FILE_TOO_LARGE",
        )
        self.assert_error(
            self.client.post(
                "/api/v1/uploads",
                headers=self.teacher_headers,
                files={"file": ("image.png", png, "image/png")},
            ),
            403,
            "FORBIDDEN",
        )
        with self.client.app.state.database.session_factory() as db, db.begin():
            record = db.get(UploadedFile, attachment["attachment_id"])
            record.created_at = datetime.now(timezone.utc) - timedelta(hours=25)
            stored_path = self.settings.upload_dir / record.storage_key
        with self.client.app.state.database.session_factory() as db:
            self.assertEqual(cleanup_expired_unattached_uploads(db, self.settings), 1)
        self.assertFalse(stored_path.exists())
        self.assert_error(
            self.client.get(attachment["download_url"], headers=self.student_headers),
            404,
            "ATTACHMENT_NOT_FOUND",
        )

    def test_upload_rejects_duplicate_and_extra_parts_without_saving(self) -> None:
        png = self._image_bytes("PNG")
        file = ("file", ("one.png", png, "image/png"))
        invalid_parts = (
            [file, ("file", ("two.png", png, "image/png"))],
            [file, ("another", ("two.png", png, "image/png"))],
            [file, ("user_id", (None, "demo_student_02"))],
            [("another", ("one.png", png, "image/png"))],
            [("file", (None, "not an uploaded image"))],
        )
        with self.client.app.state.database.session_factory() as db:
            before = db.scalar(select(func.count()).select_from(UploadedFile))
        for parts in invalid_parts:
            with self.subTest(fields=[part[0] for part in parts]):
                self.assert_error(
                    self.client.post(
                        "/api/v1/uploads", headers=self.student_headers, files=parts
                    ),
                    422,
                    "VALIDATION_ERROR",
                )
        with self.client.app.state.database.session_factory() as db:
            self.assertEqual(
                db.scalar(select(func.count()).select_from(UploadedFile)), before
            )
        self.assertFalse(any(self.settings.upload_dir.iterdir()))

    @staticmethod
    def _image_bytes(image_format: str) -> bytes:
        buffer = io.BytesIO()
        Image.new("RGB", (2, 2), (18, 183, 167)).save(buffer, image_format)
        return buffer.getvalue()

    def test_teacher_snapshot_denominators_filters_and_scope(self) -> None:
        response = self.client.get(
            "/api/v1/dashboard/teacher", headers=self.teacher_headers
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        summary = payload["summary"]
        self.assertEqual(summary["roster_student_count"], 42)
        self.assertEqual(
            summary["accuracy_percentage"],
            round(summary["correct_count"] / summary["practice_count"] * 100, 1),
        )
        self.assertEqual(
            summary["animation_completion_percentage"],
            round(
                summary["animation_completed_count"]
                / summary["animation_observation_count"]
                * 100,
                1,
            ),
        )
        self.assertTrue(
            any(
                item["question_count"] > item["practice_count"]
                for item in payload["roster"]
            )
        )
        before = dict(summary)
        with self.client.app.state.database.session_factory() as db, db.begin():
            conversation = db.get(Conversation, "demo-conv-newton")
            user = db.get(User, "demo_student_01")
            message = Message(
                id="test-new-learning-assistant",
                conversation_id=conversation.id,
                sequence=2,
                role="assistant",
                text="新的教學回答",
                response_type="learning_answer",
                structured_response=None,
                source_snapshot=[],
                suggested_follow_ups=[],
                attachment_ids_snapshot=[],
                demo=True,
                created_at=datetime.now(timezone.utc),
            )
            db.add(message)
            db.flush()
            activity = record_learning_question(
                db,
                conversation=conversation,
                assistant_message=message,
                user=user,
                topic="newton",
                subject="物理",
            )
            self.assertIsNone(activity.practice_correct)
            self.assertIsNone(activity.animation_completed)
        after_question = self.client.get(
            "/api/v1/dashboard/teacher", headers=self.teacher_headers
        ).json()["summary"]
        self.assertEqual(after_question["question_count"], before["question_count"] + 1)
        for field in (
            "practice_count",
            "correct_count",
            "gap_count",
            "animation_completed_count",
            "animation_observation_count",
        ):
            self.assertEqual(after_question[field], before[field])

        with self.client.app.state.database.session_factory() as db, db.begin():
            conversation = db.get(Conversation, "demo-conv-newton")
            user = db.get(User, "demo_student_01")
            message = db.get(Message, "test-new-learning-assistant")
            activity = db.scalar(
                select(LearningActivity).where(
                    LearningActivity.message_id == message.id
                )
            )
            record_primary_insight(
                db,
                conversation=conversation,
                assistant_message=message,
                user=user,
                projection=learning_gap_projection("newton"),
                confidence=0.9,
                learning_activity=activity,
            )
        after_gap = self.client.get(
            "/api/v1/dashboard/teacher", headers=self.teacher_headers
        ).json()["summary"]
        self.assertEqual(after_gap["question_count"], after_question["question_count"])
        self.assertEqual(after_gap["gap_count"], after_question["gap_count"] + 1)
        filtered = self.client.get(
            "/api/v1/dashboard/teacher?period=30d&class_id=801&subject=物理&attention_threshold=60",
            headers=self.teacher_headers,
        )
        self.assertEqual(filtered.status_code, 200, filtered.text)
        self.assertEqual(filtered.json()["summary"]["roster_student_count"], 14)
        self.assertTrue(
            all(item["class_id"] == "801" for item in filtered.json()["roster"])
        )
        self.assertTrue(
            all(item["subject"] == "物理" for item in filtered.json()["topics"])
        )
        self.assert_error(
            self.client.get(
                "/api/v1/dashboard/teacher?attention_threshold=55",
                headers=self.teacher_headers,
            ),
            422,
            "VALIDATION_ERROR",
        )
        with self.client.app.state.database.session_factory() as db, db.begin():
            restricted_class = db.get(TeacherClass, "demo-class-803")
            restricted_class.teacher_user_id = "demo_government_01"
        self.assert_error(
            self.client.get(
                "/api/v1/dashboard/teacher?class_id=803",
                headers=self.teacher_headers,
            ),
            403,
            "FORBIDDEN",
        )
        self.assert_error(
            self.client.get("/api/v1/dashboard/teacher", headers=self.student_headers),
            403,
            "FORBIDDEN",
        )
        forbidden = {
            "family_occupation",
            "economic_status",
            "raw_message",
            "conversation_id",
        }
        self.assertFalse(forbidden & self._recursive_keys(payload))

    def test_government_is_aggregate_only_and_counts_projection(self) -> None:
        with self.client.app.state.database.session_factory() as db, db.begin():
            db.add(
                InsightEvent(
                    id="test-insight-without-allowed-region",
                    message_id=None,
                    learning_activity_id=None,
                    user_id=None,
                    region=None,
                    event_type="casual",
                    government_topic="science",
                    learning_topic=None,
                    resource_category=None,
                    confidence=0.8,
                    potential_need=False,
                    resource_view=False,
                    source_kind="test_observation",
                    source_reference="test-insight-without-allowed-region",
                    occurred_at=datetime.now(timezone.utc),
                    demo=True,
                )
            )
        insight_statements: list[str] = []

        def capture_insight_select(
            _connection: object,
            _cursor: object,
            statement: str,
            _parameters: object,
            _context: object,
            _executemany: bool,
        ) -> None:
            normalized = " ".join(statement.lower().split())
            if "from insight_events" in normalized:
                insight_statements.append(normalized)

        engine = self.client.app.state.database.engine
        event.listen(engine, "before_cursor_execute", capture_insight_select)
        try:
            response = self.client.get(
                "/api/v1/dashboard/government", headers=self.government_headers
            )
        finally:
            event.remove(engine, "before_cursor_execute", capture_insight_select)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(insight_statements), 1, insight_statements)
        government_select = insight_statements[0]
        self.assertIn("group by", government_select)
        self.assertIn("count(", government_select)
        for forbidden_column in (
            "insight_events.id",
            "insight_events.user_id",
            "insight_events.message_id",
            "insight_events.learning_activity_id",
            "insight_events.source_kind",
            "insight_events.source_reference",
        ):
            self.assertNotIn(forbidden_column, government_select)
        self.assertNotIn(" join ", government_select)
        for forbidden_table in (
            "users",
            "profiles",
            "conversations",
            "messages",
            "uploaded_files",
        ):
            self.assertNotIn(forbidden_table, government_select)
        payload = response.json()
        forbidden = {
            "user_id",
            "student_id",
            "name",
            "nickname",
            "conversation_id",
            "message_id",
            "attachment_id",
            "profile",
            "source_reference",
        }
        self.assertFalse(forbidden & self._recursive_keys(payload))
        totals = payload["totals"]
        self.assertLessEqual(
            totals["resource_view_count"], totals["resource_need_count"]
        )
        self.assertLessEqual(
            totals["potential_need_count"], totals["resource_need_count"]
        )
        self.assertLessEqual(totals["resource_need_count"], totals["event_count"])
        self.assertEqual(
            totals,
            self._government_expected_counts(
                datetime.fromisoformat(
                    payload["window"]["start_date"] + "T00:00:00+00:00"
                ),
                datetime.fromisoformat(
                    payload["window"]["end_date"] + "T00:00:00+00:00"
                )
                + timedelta(days=1),
            ),
        )
        with self.client.app.state.database.session_factory() as db:
            excluded = db.get(InsightEvent, "test-insight-without-allowed-region")
            self.assertIsNone(excluded.region)

        filtered = self.client.get(
            "/api/v1/dashboard/government?period=30d&region=美濃&topic=agriculture",
            headers=self.government_headers,
        )
        self.assertEqual(filtered.status_code, 200, filtered.text)
        self.assertTrue(
            all(item["region"] == "美濃" for item in filtered.json()["regions"])
        )
        self.assertTrue(
            all(
                item["region"] == "美濃" and item["topic"] == "agriculture"
                for item in filtered.json()["daily_aggregates"]
            )
        )
        self.assert_error(
            self.client.get(
                "/api/v1/dashboard/government", headers=self.teacher_headers
            ),
            403,
            "FORBIDDEN",
        )

    def _government_expected_counts(
        self, start: datetime, end: datetime
    ) -> dict[str, int]:
        with self.client.app.state.database.session_factory() as db:
            rows = list(
                db.scalars(
                    select(InsightEvent).where(
                        InsightEvent.occurred_at >= start,
                        InsightEvent.occurred_at < end,
                        InsightEvent.region.in_(ALLOWED_REGIONS),
                    )
                )
            )
        resource_types = {InsightType.RESOURCE_NEED, InsightType.RESOURCE_INTEREST}
        return {
            "event_count": len(rows),
            "resource_need_count": sum(
                row.event_type in resource_types for row in rows
            ),
            "potential_need_count": sum(row.potential_need for row in rows),
            "resource_view_count": sum(row.resource_view for row in rows),
        }

    @staticmethod
    def _recursive_keys(value: Any) -> set[str]:
        if isinstance(value, dict):
            return set(value) | {
                key
                for item in value.values()
                for key in CoreApiIntegrationTest._recursive_keys(item)
            }
        if isinstance(value, list):
            return {
                key
                for item in value
                for key in CoreApiIntegrationTest._recursive_keys(item)
            }
        return set()


if __name__ == "__main__":
    unittest.main()
