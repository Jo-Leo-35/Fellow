"""Check the isolated functional fixture across restart and container recreation."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import subprocess
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "fixture", ROOT / "scripts/integration-fixture.py"
)
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--state", type=Path, default=ROOT / ".codex-runs/integration-fixture.json"
    )
    args = parser.parse_args()
    state = fixture.read_state(args.state)
    values = dict(
        line.split("=", 1)
        for line in Path(state["env_file"]).read_text().splitlines()
        if "=" in line and not line.startswith("#")
    )
    codes = json.loads(values["DEMO_ACCESS_CODES"])
    tokens = {}

    def call(
        path: str,
        *,
        role: str = "student",
        body: dict | None = None,
        method: str | None = None,
        key: str | None = None,
    ):
        headers = {"Accept": "application/json"}
        if role in tokens:
            headers["Authorization"] = f"Bearer {tokens[role]}"
        if body is not None:
            headers["Content-Type"] = "application/json"
        if key:
            headers["Idempotency-Key"] = key
        request = urllib.request.Request(
            state["base_url"] + "/api/v1" + path,
            data=None if body is None else json.dumps(body).encode(),
            headers=headers,
            method=method,
        )
        with urllib.request.urlopen(request, timeout=50) as response:
            if response.status == 204:
                return None
            return json.load(response)

    for role in ("student", "teacher", "government"):
        session = call(
            "/auth/demo/session", role=role, body={"access_code": codes[f"{role}_demo"]}
        )
        assert session["session"]["role"] == role
        tokens[role] = session["access_token"]
    user = call("/auth/session")["session"]["user_id"]
    profile_path = f"/profile/{user}"
    call(profile_path + "/memory/family_occupation", method="DELETE")
    request = {
        "user_id": user,
        "conversation_id": None,
        "mode": "resource",
        "category": "agriculture",
        "message": "家裡務農，颱風後農損想找補助",
        "attachment_ids": [],
    }
    key = str(uuid.uuid4())
    answer = call("/agent/chat", body=request, key=key)
    call(
        profile_path + "/memory",
        body={
            "suggestion_id": answer["memory_suggestion"]["suggestion_id"],
            "consent": True,
        },
    )
    alerts_path = f"/alerts?user_id={user}"
    alerts = call(alerts_path)
    assert alerts["items"]
    call(f"/alerts/{alerts['items'][0]['alert_id']}/read", method="POST")
    paths = [
        profile_path,
        alerts_path,
        "/usage",
        "/auth/session",
        f"/conversations?user_id={user}",
        f"/conversations/{answer['conversation_id']}",
    ]
    snapshots = {path: call(path) for path in paths}
    dashboards = {
        role: call(f"/dashboard/{role}", role=role)
        for role in ("teacher", "government")
    }

    def storage_digest() -> str:
        environment = dict(os.environ, FUTUREAI_ENV_FILE=state["env_file"])
        for name in ("WEB_PORT", "WEB_BIND", "COMPOSE_PROJECT_NAME"):
            environment.pop(name, None)
        result = subprocess.run(
            [
                "docker",
                "compose",
                "--env-file",
                state["env_file"],
                "-p",
                state["project"],
                "exec",
                "-T",
                "backend",
                "python",
                "-",
            ],
            cwd=ROOT,
            env=environment,
            capture_output=True,
            text=True,
            check=True,
            input="""
import hashlib, json, sqlite3
from pathlib import Path
from app.core.config import Settings
import chromadb
from chromadb.config import Settings as ChromaSettings
settings = Settings()
db = sqlite3.connect(settings.data_dir / 'app.db')
tables = [row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
rows = {name: sorted(db.execute('SELECT * FROM "' + name + '"').fetchall()) for name in tables}
db.close()
files = {str(path.relative_to(settings.data_dir)): hashlib.sha256(path.read_bytes()).hexdigest() for path in (settings.data_dir / 'uploads').rglob('*') if path.is_file()}
chroma = chromadb.PersistentClient(path=str(settings.chroma_path), settings=ChromaSettings(anonymized_telemetry=False))
collections = {}
for collection in chroma.list_collections():
    content = collection.get(include=['documents', 'metadatas', 'embeddings'])
    embeddings = content['embeddings'].tolist()
    collections[collection.name] = sorted(zip(content['ids'], content['documents'], content['metadatas'], embeddings))
assert sorted(len(items) for items in collections.values()) == [12, 18]
print(hashlib.sha256(json.dumps({'rows':rows,'files':files,'collections':collections},sort_keys=True,default=str).encode()).hexdigest())
""",
        )
        digest = result.stdout.strip().splitlines()[-1]
        assert len(digest) == 64
        return digest

    baseline = storage_digest()
    for operation in ("restart", "recreate"):
        if operation == "restart":
            fixture.compose(state, "restart")
        else:
            fixture.compose(state, "down")
        fixture.compose(state, "up", "-d", "--wait")
        assert storage_digest() == baseline, (
            f"SQLite rows, attachment bytes, or Chroma counts changed during {operation}"
        )
        for path, expected in snapshots.items():
            assert call(path) == expected, (
                f"Persisted endpoint changed during {operation}: {path}"
            )
        for role, expected in dashboards.items():
            assert call(f"/dashboard/{role}", role=role) == expected
        replay = call("/chat", body=request, key=key)
        assert replay["message_id"] == answer["message_id"]
        assert call("/usage") == snapshots["/usage"]
        assert storage_digest() == baseline, (
            "Reading or alias replay changed persistent state"
        )
        print(
            f"PASS {operation}: all SQLite rows, uploads, Chroma, sessions, quota, memory, reads, history and dashboards preserved"
        )
    relogin = call("/auth/demo/session", body={"access_code": codes["student_demo"]})
    tokens["student"] = relogin["access_token"]
    assert call("/usage") == snapshots["/usage"]
    print("PASS relogin preserves usage; no credentials were printed")


if __name__ == "__main__":
    main()
