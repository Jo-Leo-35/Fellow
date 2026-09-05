from __future__ import annotations

from collections.abc import Iterator

from fastapi import Request
from sqlalchemy import Engine, create_engine, event, inspect
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.db.base import Base


class Database:
    def __init__(self, settings: Settings):
        url = settings.resolved_database_url
        connect_args = (
            {"check_same_thread": False, "timeout": 30}
            if url.startswith("sqlite")
            else {}
        )
        self.engine: Engine = create_engine(
            url, connect_args=connect_args, pool_pre_ping=True
        )
        if url.startswith("sqlite"):
            event.listen(self.engine, "connect", self._configure_sqlite)
        self.session_factory = sessionmaker(
            bind=self.engine,
            class_=Session,
            autoflush=False,
            expire_on_commit=False,
        )

    @staticmethod
    def _configure_sqlite(dbapi_connection: object, _connection_record: object) -> None:
        cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()

    def create_schema(self) -> None:
        from app.db import models  # noqa: F401 - register mapped tables

        Base.metadata.create_all(self.engine)
        self._upgrade_quota_reservation_attempt_identity()

    def _upgrade_quota_reservation_attempt_identity(self) -> None:
        """Small SQLite compatibility migration for pre-4.1 Demo databases."""

        if not str(self.engine.url).startswith("sqlite"):
            return
        columns = {
            column["name"]
            for column in inspect(self.engine).get_columns("quota_reservations")
        }
        if "attempt_id" in columns:
            return
        with self.engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE quota_reservations ADD COLUMN attempt_id VARCHAR(128)"
            )
            connection.exec_driver_sql(
                "UPDATE quota_reservations SET attempt_id = id WHERE attempt_id IS NULL"
            )

    def dispose(self) -> None:
        self.engine.dispose()


def get_db(request: Request) -> Iterator[Session]:
    database: Database = request.app.state.database
    with database.session_factory() as session:
        yield session
