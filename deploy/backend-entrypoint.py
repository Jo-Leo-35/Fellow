"""Prepare persistent Demo state, then replace this process with one API worker."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from datetime import date, datetime, timezone


def prepare() -> None:
    from app.core.config import Settings
    from app.db.database import Database
    from app.rag.indexer import build_index
    from app.services.startup import validate_startup_readiness
    from scripts.seed import seed_database

    settings = Settings()
    settings.prepare_directories()
    anchor = date.fromisoformat(
        os.environ.get(
            "DEMO_SEED_ANCHOR_DATE", datetime.now(timezone.utc).date().isoformat()
        )
    )
    database = Database(settings)
    try:
        counts = seed_database(database, anchor)
        index_counts = asyncio.run(build_index(settings))
        with database.session_factory() as session:
            validate_startup_readiness(session, settings)
    finally:
        database.dispose()
    print(
        json.dumps(
            {
                "status": "ready",
                "runtime_mode": settings.runtime_mode,
                "seed_counts": counts,
                "index_counts": index_counts,
            },
            ensure_ascii=False,
        ),
        flush=True,
    )


if __name__ == "__main__":
    try:
        prepare()
    except Exception as exc:  # noqa: BLE001 - final boundary sanitizes startup errors
        # Do not print exception bodies: upstream errors may include supplied data.
        print(
            f"Backend preparation failed ({type(exc).__name__}). "
            "Check server configuration, seeded identities, writable volumes, and index setup.",
            file=sys.stderr,
            flush=True,
        )
        sys.exit(1)
    os.execv(
        sys.executable,
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            "8000",
            "--workers",
            "1",
            "--no-proxy-headers",
            "--no-access-log",
        ],
    )
