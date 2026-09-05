from __future__ import annotations

import os
import secrets
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from app.core.config import Settings
from app.db.database import Database
from app.db.models import (
    DemoPrincipal,
    IdempotencyRecord,
    QuotaLedger,
    QuotaReservation,
)
from app.schemas.chat import AgentChatRequestWire, AgentChatResponseWire
from app.schemas.enums import ResponseType
from app.services.auth import exchange_access_code, get_usage
from app.services.quota import (
    ReservedAgentRequest,
    finalize_agent_request,
    recover_reservations,
    release_agent_request,
    reserve_agent_request,
)
from scripts.seed import seed_database
from sqlalchemy import select, update

PRESERVED_TABLES = (
    "users",
    "profiles",
    "profile_memories",
    "conversations",
    "messages",
    "auth_sessions",
    "quota_ledgers",
    "idempotency_records",
    "quota_reservations",
)


def _snapshot(path: Path) -> dict[str, list[tuple]]:
    with sqlite3.connect(path) as connection:
        result = {}
        for table in PRESERVED_TABLES:
            columns = [
                row[1]
                for row in connection.execute(f"PRAGMA table_info({table})")
                if row[1] != "attempt_id"
            ]
            rows = connection.execute(
                f"SELECT {','.join(columns)} FROM {table}"
            ).fetchall()
            result[table] = sorted(rows, key=repr)
        return result


def _ledger_state(database: Database, ledger_id: str) -> tuple[int, int]:
    with database.session_factory() as session:
        ledger = session.get(QuotaLedger, ledger_id)
        if ledger is None:
            raise AssertionError("Expected the persisted quota ledger")
        return ledger.used_count, ledger.reserved_count


class LegacySchemaRegressionTest(unittest.TestCase):
    def test_pre41_upgrade_preserves_data_and_isolates_attempts(self) -> None:
        with (
            patch.dict(os.environ, {}, clear=True),
            tempfile.TemporaryDirectory(prefix="futureai-legacy-schema-") as directory,
        ):
            root = Path(directory)
            path = root / "app.db"
            code = secrets.token_urlsafe(32)
            settings = Settings(
                _env_file=None,
                app_env="test",
                runtime_mode="offline_demo",
                data_dir=root,
                chroma_path=root / "chroma",
                database_url=f"sqlite:///{path}",
                demo_access_codes={"student_demo": code},
            )
            database = Database(settings)
            try:
                seed_database(database, datetime.now(timezone.utc).date())
                with database.session_factory() as session:
                    exchange_access_code(session, settings, code)
                    principal = session.scalar(
                        select(DemoPrincipal).where(
                            DemoPrincipal.config_key == "student_demo"
                        )
                    )
                    self.assertIsNotNone(principal)
                    body = AgentChatRequestWire(
                        user_id=principal.user_id,
                        conversation_id=None,
                        mode="learning",
                        message="請解釋牛頓第二定律",
                        attachment_ids=[],
                        topic="newton",
                    )
                    original = reserve_agent_request(
                        session, settings, principal, "legacy-upgrade-proof", body
                    ).reservation
                    self.assertIsNotNone(original)
            finally:
                database.dispose()

            # Recreate the actual pre-4.1 table shape, not merely a null value.
            with sqlite3.connect(path) as connection:
                connection.execute(
                    "ALTER TABLE quota_reservations DROP COLUMN attempt_id"
                )
                columns = {
                    row[1]
                    for row in connection.execute(
                        "PRAGMA table_info(quota_reservations)"
                    )
                }
                self.assertNotIn("attempt_id", columns)
            before = _snapshot(path)
            for table, rows in before.items():
                self.assertTrue(rows, f"Preservation check requires data in {table}")

            database = Database(settings)
            try:
                for _ in range(2):
                    database.create_schema()
                    self.assertEqual(_snapshot(path), before)
                with sqlite3.connect(path) as connection:
                    self.assertEqual(
                        connection.execute("PRAGMA foreign_key_check").fetchall(), []
                    )
                    migrated_attempt = connection.execute(
                        "SELECT attempt_id FROM quota_reservations WHERE id=?",
                        (original.reservation_id,),
                    ).fetchone()[0]
                self.assertEqual(migrated_attempt, original.reservation_id)

                with database.session_factory() as session:
                    self.assertEqual(recover_reservations(session), 0)
                self.assertEqual(_ledger_state(database, original.ledger_id), (0, 1))
                old = ReservedAgentRequest(
                    reservation_id=original.reservation_id,
                    attempt_id=migrated_attempt,
                    idempotency_record_id=original.idempotency_record_id,
                    ledger_id=original.ledger_id,
                )
                with database.session_factory() as session:
                    session.execute(
                        update(QuotaReservation)
                        .where(QuotaReservation.id == old.reservation_id)
                        .values(
                            expires_at=datetime.now(timezone.utc) - timedelta(seconds=1)
                        )
                    )
                    session.commit()
                    self.assertEqual(recover_reservations(session), 1)
                self.assertEqual(_ledger_state(database, old.ledger_id), (0, 0))

                with database.session_factory() as session:
                    principal = session.scalar(
                        select(DemoPrincipal).where(
                            DemoPrincipal.config_key == "student_demo"
                        )
                    )
                    new = reserve_agent_request(
                        session, settings, principal, "legacy-upgrade-proof", body
                    ).reservation
                    usage = get_usage(session, principal)
                self.assertIsNotNone(new)
                self.assertEqual(new.reservation_id, old.reservation_id)
                self.assertNotEqual(new.attempt_id, old.attempt_id)
                response = AgentChatResponseWire(
                    conversation_id="migration-test-conversation",
                    message_id="migration-test-message",
                    response_type=ResponseType.TEXT,
                    text="Quota transition validation only.",
                    learning_answer=None,
                    resource_recommendation=None,
                    memory_suggestion=None,
                    alert=None,
                    sources=[],
                    suggested_follow_ups=[],
                    created_at=datetime.now(timezone.utc),
                    demo=True,
                    usage=usage,
                )
                with database.session_factory() as session:
                    release_agent_request(session, old)
                self.assertEqual(_ledger_state(database, new.ledger_id), (0, 1))
                with database.session_factory() as session:
                    with self.assertRaises(RuntimeError):
                        finalize_agent_request(session, old, response)
                    session.rollback()
                self.assertEqual(_ledger_state(database, new.ledger_id), (0, 1))
                with database.session_factory() as session:
                    usage = finalize_agent_request(session, new, response)
                    session.commit()
                    self.assertEqual((usage.used, usage.reserved), (1, 0))
                with database.session_factory() as session:
                    release_agent_request(session, old)
                    record = session.get(IdempotencyRecord, new.idempotency_record_id)
                    self.assertEqual(record.resource_id, response.message_id)
                self.assertEqual(_ledger_state(database, new.ledger_id), (1, 0))
            finally:
                database.dispose()


if __name__ == "__main__":
    unittest.main()
