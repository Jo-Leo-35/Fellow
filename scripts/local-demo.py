"""Build and run the complete Demo on loopback without Docker."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import socket
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "runtime" / "local-demo"
VENV = ROOT / ".venv"
STATE_FILE = RUNTIME / "processes.json"
ENV_KEY = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def read_env(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise RuntimeError(
            f"找不到設定檔：{path}\n"
            "請先執行 python3 scripts/create-demo-env.py --port 45465"
        )
    values: dict[str, str] = {}
    for number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator or not ENV_KEY.fullmatch(key):
            raise RuntimeError(f"設定檔第 {number} 行格式不正確")
        values[key] = value
    return values


def run(command: list[str], *, env: dict[str, str] | None = None) -> None:
    subprocess.run(command, cwd=ROOT, env=env, check=True)


def ensure_dependencies() -> None:
    requirements = ROOT / "backend" / "requirements.txt"
    digest = hashlib.sha256(requirements.read_bytes()).hexdigest()
    marker = VENV / ".futureai-requirements.sha256"
    if not (VENV / "bin" / "python").exists():
        print("建立本機 Python 環境…", flush=True)
        # Ubuntu may omit ensurepip unless python3-venv is installed. The
        # environment still isolates imports; pip installs into its site-packages.
        run([sys.executable, "-m", "venv", "--without-pip", str(VENV)])
    if not marker.exists() or marker.read_text(encoding="utf-8").strip() != digest:
        print("安裝後端套件…", flush=True)
        site_packages = next(VENV.glob("lib/python*/site-packages"), None)
        if site_packages is None:
            raise RuntimeError("找不到本機 Python site-packages")
        run(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "--target",
                str(site_packages),
                "--upgrade",
                "-r",
                str(requirements),
            ]
        )
        marker.write_text(digest + "\n", encoding="utf-8")
    if not (ROOT / "node_modules" / ".bin" / "vite").exists():
        print("安裝前端套件…", flush=True)
        run(["npm", "ci"])


def pid_command(pid: int) -> str:
    try:
        return Path(f"/proc/{pid}/cmdline").read_bytes().replace(b"\0", b" ").decode()
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        return ""


def process_is_ours(pid: int, kind: str) -> bool:
    command = pid_command(pid)
    if kind == "backend":
        expected = "uvicorn" in command
    else:
        expected = "/node_modules/.bin/vite" in command and " preview " in f" {command} "
    return str(ROOT) in command and expected


def load_state() -> dict[str, int]:
    try:
        raw = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        return {key: int(raw[key]) for key in ("backend", "frontend")}
    except (FileNotFoundError, KeyError, TypeError, ValueError, json.JSONDecodeError):
        return {}


def active_state() -> dict[str, int]:
    return {
        kind: pid
        for kind, pid in load_state().items()
        if process_is_ours(pid, kind)
    }


def stop_processes(*, quiet: bool = False) -> None:
    state = active_state()
    for kind, pid in state.items():
        try:
            os.killpg(pid, signal.SIGTERM)
        except ProcessLookupError:
            continue
        if not quiet:
            print(f"停止 {kind}…", flush=True)
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline and any(pid_command(pid) for pid in state.values()):
        time.sleep(0.1)
    for kind, pid in state.items():
        if process_is_ours(pid, kind):
            os.killpg(pid, signal.SIGKILL)
    STATE_FILE.unlink(missing_ok=True)


def port_is_free(port: int) -> bool:
    with socket.socket() as listener:
        listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            listener.bind(("127.0.0.1", port))
        except OSError:
            return False
    return True


def wait_for_health(url: str, process: subprocess.Popen[bytes], seconds: int = 90) -> None:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"服務啟動失敗，請查看 {RUNTIME / (process.name + '.log')}")
        try:
            with urlopen(url, timeout=2) as response:
                content_type = response.headers.get_content_type()
                payload = json.loads(response.read()) if content_type == "application/json" else {}
                if response.status == 200 and payload.get("status") == "ok":
                    return
        except (URLError, TimeoutError, ConnectionError, json.JSONDecodeError):
            pass
        time.sleep(0.25)
    raise RuntimeError(f"等待服務逾時：{url}")


def spawn(name: str, command: list[str], env: dict[str, str]) -> subprocess.Popen[bytes]:
    log_path = RUNTIME / f"{name}.log"
    log = log_path.open("ab", buffering=0)
    process = subprocess.Popen(
        command,
        cwd=ROOT,
        env=env,
        stdout=log,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    process.name = name  # type: ignore[attr-defined]
    log.close()
    return process


def start(args: argparse.Namespace) -> None:
    if active_state():
        print("本機 Demo 已在執行；如需重啟請先執行 scripts/local-demo.py stop")
        return
    for port in (args.port, args.backend_port):
        if not port_is_free(port):
            raise RuntimeError(f"localhost:{port} 已被其他程式使用")

    RUNTIME.mkdir(parents=True, exist_ok=True)
    ensure_dependencies()
    environment = dict(os.environ)
    environment.update(read_env(args.env_file))
    environment.update(
        {
            "APP_DATA_DIR": str(RUNTIME / "data"),
            "CHROMA_PATH": str(RUNTIME / "chroma"),
            "FRONTEND_ORIGIN": (
                f"http://localhost:{args.port},http://127.0.0.1:{args.port}"
            ),
            "PYTHONPATH": str(ROOT / "backend"),
            "ANONYMIZED_TELEMETRY": "False",
        }
    )
    environment.pop("DATABASE_URL", None)

    print("準備本機資料與離線索引…", flush=True)
    run([str(VENV / "bin" / "python"), "backend/scripts/seed.py"], env=environment)
    run([str(VENV / "bin" / "python"), "backend/scripts/build_index.py"], env=environment)

    build_environment = dict(environment, VITE_API_URL="/api/v1")
    print("建立前端 production build…", flush=True)
    run(["npm", "run", "build"], env=build_environment)

    backend: subprocess.Popen[bytes] | None = None
    frontend: subprocess.Popen[bytes] | None = None
    try:
        backend = spawn(
            "backend",
            [
                str(VENV / "bin" / "python"),
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(args.backend_port),
                "--workers",
                "1",
                "--no-proxy-headers",
                "--no-access-log",
            ],
            environment,
        )
        wait_for_health(f"http://127.0.0.1:{args.backend_port}/health", backend)
        preview_environment = dict(
            environment,
            VITE_BACKEND_TARGET=f"http://127.0.0.1:{args.backend_port}",
        )
        frontend = spawn(
            "frontend",
            [
                str(ROOT / "node_modules" / ".bin" / "vite"),
                "--config",
                str(ROOT / "frontend" / "vite.config.ts"),
                "preview",
                "--host",
                "127.0.0.1",
                "--port",
                str(args.port),
                "--strictPort",
            ],
            preview_environment,
        )
        wait_for_health(f"http://127.0.0.1:{args.port}/health", frontend)
        STATE_FILE.write_text(
            json.dumps({"backend": backend.pid, "frontend": frontend.pid, "port": args.port})
            + "\n",
            encoding="utf-8",
        )
    except Exception:
        for process in (frontend, backend):
            if process is not None and process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
        raise

    print(f"Demo 已啟動：http://localhost:{args.port}/index.html")
    print("僅監聽 127.0.0.1；停止請執行：python3 scripts/local-demo.py stop")


def status() -> None:
    state = active_state()
    if len(state) == 2:
        print("本機 Demo 執行中（frontend 與 backend 均只監聽 localhost）")
    elif state:
        print("本機 Demo 僅部分執行，請先 stop 後再 start")
    else:
        print("本機 Demo 未執行")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("start", "stop", "restart", "status"), nargs="?", default="start")
    parser.add_argument("--port", type=int, default=45465)
    parser.add_argument("--backend-port", type=int, default=45466)
    parser.add_argument("--env-file", type=Path, default=ROOT / ".env")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535 or not 1 <= args.backend_port <= 65535:
        parser.error("port 必須介於 1 到 65535")
    if args.port == args.backend_port:
        parser.error("前端與後端 port 不可相同")
    args.env_file = args.env_file.expanduser().resolve()
    return args


def main() -> None:
    args = parse_args()
    try:
        if args.action in {"stop", "restart"}:
            stop_processes()
        if args.action in {"start", "restart"}:
            start(args)
        elif args.action == "status":
            status()
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(f"錯誤：{error}", file=sys.stderr)
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
