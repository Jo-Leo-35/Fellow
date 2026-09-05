"""Prepare and operate an isolated Compose fixture; never print credentials."""

from __future__ import annotations

import argparse
import json
import os
import re
import secrets
import socket
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KIND = "futureai-integration-fixture-v1"


def read_state(path: Path) -> dict:
    state = json.loads(path.read_text(encoding="utf-8"))
    if state.get("kind") != KIND or not re.fullmatch(
        r"futureai-integration-[a-f0-9]{12}", state.get("project", "")
    ):
        raise ValueError("This command only operates on its own isolated fixture")
    return state


def compose(state: dict, *args: str, input_text: str | None = None) -> None:
    environment = dict(os.environ)
    for key in ("WEB_PORT", "WEB_BIND", "COMPOSE_PROJECT_NAME"):
        environment.pop(key, None)
    environment["FUTUREAI_ENV_FILE"] = state["env_file"]
    subprocess.run(
        [
            "docker",
            "compose",
            "--env-file",
            state["env_file"],
            "-p",
            state["project"],
            *args,
        ],
        cwd=ROOT,
        env=environment,
        input=input_text,
        text=True,
        check=True,
    )


def prepare(path: Path) -> dict:
    if path.exists():
        raise ValueError("Fixture state already exists; existing data was not changed")
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    directory = Path(tempfile.mkdtemp(prefix="futureai-integration-"))
    env_file = directory / "demo.env"
    codes = {
        f"{role}_demo": secrets.token_urlsafe(32)
        for role in ("student", "teacher", "government")
    }
    replacements = {
        "DEMO_ACCESS_CODES": json.dumps(codes, separators=(",", ":")),
        "WEB_PORT": str(port),
        "FRONTEND_ORIGIN": f"http://localhost:{port},http://127.0.0.1:{port}",
        "AUTH_EXCHANGE_RATE_LIMIT_REQUESTS": "1000",
        "AGENT_RATE_LIMIT_REQUESTS": "1000",
    }
    lines = []
    for line in (ROOT / ".env.example").read_text(encoding="utf-8").splitlines():
        key = line.partition("=")[0]
        lines.append(f"{key}={replacements[key]}" if key in replacements else line)
    descriptor = os.open(env_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
    state = {
        "kind": KIND,
        "project": f"futureai-integration-{secrets.token_hex(6)}",
        "env_file": str(env_file),
        "base_url": f"http://127.0.0.1:{port}",
        "functional_daily_quota": 1000,
        "functional_rate_per_minute": 1000,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as handle:
        json.dump(state, handle, indent=2)
        handle.write("\n")
    return state


def configure_quota(state: dict) -> None:
    # Only the fixture's student principal and its existing ledgers are touched.
    # Counts are preserved. Real limit/rate rejection is covered independently.
    compose(
        state,
        "exec",
        "-T",
        "backend",
        "python",
        "-",
        input_text="""
from app.core.config import Settings
from app.db.database import Database
from app.db.models import DemoPrincipal, QuotaLedger
from sqlalchemy import update
database = Database(Settings())
with database.session_factory() as db, db.begin():
    principal = db.get(DemoPrincipal, 'demo-principal-student')
    assert principal is not None and principal.user_id == 'demo_student_01'
    principal.daily_quota_limit = 1000
    db.execute(update(QuotaLedger).where(QuotaLedger.principal_id == principal.id).values(quota_limit=1000))
database.dispose()
print('Isolated functional fixture quota configured; usage counts preserved.')
""",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action", choices=("prepare", "up", "configure", "restart", "down", "status")
    )
    parser.add_argument(
        "--state", type=Path, default=ROOT / ".codex-runs/integration-fixture.json"
    )
    args = parser.parse_args()
    state = prepare(args.state) if args.action == "prepare" else read_state(args.state)
    if args.action == "up":
        compose(state, "up", "--build", "-d", "--wait")
        configure_quota(state)
    elif args.action == "configure":
        configure_quota(state)
    elif args.action == "restart":
        compose(state, "restart")
        compose(state, "up", "-d", "--wait")
    elif args.action == "down":
        compose(
            state, "down"
        )  # Deliberately keep the fixture volumes for persistence checks.
    elif args.action == "status":
        compose(state, "ps")
    print(
        json.dumps(
            {
                "action": args.action,
                "state": str(args.state),
                "base_url": state["base_url"],
                "project": state["project"],
            }
        )
    )


if __name__ == "__main__":
    main()
