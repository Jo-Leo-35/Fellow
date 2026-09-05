from __future__ import annotations

import asyncio
import io
import os
import secrets
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from app.core.config import Settings
from app.db.database import Database
from app.db.models import (
    Conversation,
    InsightEvent,
    LearningActivity,
    Message,
    MessageAttachment,
    QuotaLedger,
    QuotaReservation,
)
from app.main import create_app
from app.rag.indexer import build_index
from app.schemas.enums import ReservationStatus
from fastapi.testclient import TestClient
from PIL import Image
from scripts.seed import seed_database
from sqlalchemy import func, select


class AutoLawRoutingIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        environment = patch.dict(
            os.environ, {"ANONYMIZED_TELEMETRY": "False"}, clear=True
        )
        environment.start()
        self.addCleanup(environment.stop)
        directory = tempfile.TemporaryDirectory(prefix="futureai-auto-law-routing-")
        self.addCleanup(directory.cleanup)
        root = Path(directory.name)
        code = secrets.token_urlsafe(32)
        settings = Settings(
            _env_file=None,
            app_env="test",
            runtime_mode="offline_demo",
            data_dir=root,
            chroma_path=root / "chroma",
            database_url=f"sqlite:///{root / 'app.db'}",
            demo_access_codes={"student_demo": code},
        )
        database = Database(settings)
        try:
            seed_database(database, datetime.now(timezone.utc).date())
        finally:
            database.dispose()
        asyncio.run(build_index(settings))
        self.client = self.enterContext(TestClient(create_app(settings)))
        response = self.client.post(
            "/api/v1/auth/demo/session", json={"access_code": code}
        )
        self.assertEqual(response.status_code, 200)
        self.headers = {"Authorization": f"Bearer {response.json()['access_token']}"}

    def usage(self) -> dict:
        response = self.client.get("/api/v1/usage", headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def counts(self) -> tuple[int, int]:
        with self.client.app.state.database.session_factory() as db:
            return (
                db.scalar(select(func.count(Conversation.id))),
                db.scalar(select(func.count(Message.id))),
            )

    def png_attachment(self) -> str:
        image = io.BytesIO()
        Image.new("RGB", (4, 4), (20, 80, 140)).save(image, format="PNG")
        response = self.client.post(
            "/api/v1/uploads",
            headers=self.headers,
            files={"file": ("law-question.png", image.getvalue(), "image/png")},
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["attachment_id"]

    def assert_auto_answer(self, message: str, topic: str, *, with_png: bool) -> None:
        before_usage = self.usage()
        before_counts = self.counts()
        attachment_ids = [self.png_attachment()] if with_png else []
        # This is the homepage contract: no explicit topic/category hint.
        body = {
            "user_id": "demo_student_01",
            "conversation_id": None,
            "mode": "auto",
            "message": message,
            "attachment_ids": attachment_ids,
        }
        headers = {**self.headers, "Idempotency-Key": secrets.token_hex(16)}
        response = self.client.post("/api/v1/agent/chat", headers=headers, json=body)
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["response_type"], "learning_answer")
        answer = payload["learning_answer"]
        self.assertEqual(answer["scenario_id"], topic)
        self.assertEqual(answer["animation_topic"], topic)
        self.assertTrue(payload["sources"])
        source_ids = {source["source_id"] for source in payload["sources"]}
        self.assertTrue(
            all(source_id.startswith(topic + "-") for source_id in source_ids)
        )
        self.assertTrue(set(answer["source_ids"]).issubset(source_ids))
        if with_png:
            self.assertIn("離線示範無法辨識圖片內容", payload["text"])
        self.assertEqual(payload["usage"]["used"], before_usage["used"] + 1)
        self.assertEqual(payload["usage"]["reserved"], 0)
        self.assertEqual(payload["usage"]["remaining"], before_usage["remaining"] - 1)
        self.assertEqual(self.usage(), payload["usage"])
        expected_counts = (before_counts[0] + 1, before_counts[1] + 2)
        self.assertEqual(self.counts(), expected_counts)

        detail = self.client.get(
            f"/api/v1/conversations/{payload['conversation_id']}", headers=self.headers
        )
        self.assertEqual(detail.status_code, 200, detail.text)
        messages = detail.json()["messages"]
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0]["text"], message)
        self.assertEqual(messages[0]["attachment_ids"], attachment_ids)
        self.assertEqual(messages[1]["learning_answer"], answer)
        self.assertEqual(messages[1]["sources"], payload["sources"])
        with self.client.app.state.database.session_factory() as db:
            conversation = db.get(Conversation, payload["conversation_id"])
            self.assertEqual(conversation.topic, topic)
            for model in (InsightEvent, LearningActivity):
                self.assertEqual(
                    db.scalar(
                        select(func.count(model.id)).where(
                            model.message_id == payload["message_id"]
                        )
                    ),
                    1,
                )
            self.assertEqual(
                db.scalar(
                    select(func.count(MessageAttachment.id)).where(
                        MessageAttachment.message_id == messages[0]["message_id"]
                    )
                ),
                int(with_png),
            )
            ledger = db.scalar(select(QuotaLedger))
            self.assertEqual(ledger.used_count, before_usage["used"] + 1)
            self.assertEqual(ledger.reserved_count, 0)
            self.assertEqual(
                db.scalar(
                    select(func.count(QuotaReservation.id)).where(
                        QuotaReservation.status == ReservationStatus.RESERVED
                    )
                ),
                0,
            )

        replay = self.client.post("/api/v1/agent/chat", headers=headers, json=body)
        self.assertEqual(replay.status_code, 200, replay.text)
        self.assertEqual(replay.json(), payload)
        self.assertEqual(self.counts(), expected_counts)
        self.assertEqual(self.usage(), payload["usage"])

    def test_auto_newton_second_law_with_and_without_png(self) -> None:
        for with_png in (False, True):
            with self.subTest(with_png=with_png):
                self.assert_auto_answer(
                    "請解釋牛頓第二定律", "newton", with_png=with_png
                )

    def test_auto_other_named_laws_keep_their_topic(self) -> None:
        for message, topic in (
            ("請解釋牛頓第一定律", "newton"),
            ("請解釋牛頓第三定律", "newton"),
            ("請解釋熱力學第一定律", "thermodynamics"),
            ("請解釋熱力學第二定律", "entropy"),
        ):
            with self.subTest(message=message):
                self.assert_auto_answer(message, topic, with_png=False)

    def test_topic_words_do_not_authorize_unrelated_offline_questions(self) -> None:
        before_usage = self.usage()
        before_counts = self.counts()
        for index, message in enumerate(
            (
                "請用牛頓第二定律介紹恐龍",
                "請用熱力學第一定律推薦晚餐",
                "請用熱力學第二定律幫我寫情書",
                "今天臺北天氣如何",
            )
        ):
            with self.subTest(message=message):
                response = self.client.post(
                    "/api/v1/agent/chat",
                    headers={**self.headers, "Idempotency-Key": f"unsupported-{index}"},
                    json={
                        "user_id": "demo_student_01",
                        "conversation_id": None,
                        "mode": "auto",
                        "message": message,
                        "attachment_ids": [],
                    },
                )
                self.assertEqual(response.status_code, 503, response.text)
                self.assertEqual(
                    response.json()["error"]["code"], "OFFLINE_DEMO_UNAVAILABLE"
                )
                self.assertEqual(self.counts(), before_counts)
                self.assertEqual(self.usage(), before_usage)


if __name__ == "__main__":
    unittest.main()
