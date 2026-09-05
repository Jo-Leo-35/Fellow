"""Build and run the complete Demo on loopback without Docker."""

from __future__ import annotations

import argparse
from collections import deque
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import signal
import socket
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen


SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
RUNTIME = ROOT / "runtime" / "local-demo"
VENV = ROOT / ".venv"
STATE_FILE = RUNTIME / "processes.json"
ENV_KEY = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
STATE_VERSION = 2


@contextmanager
def lifecycle_lock():
    """Serialize start/stop so two terminals cannot create orphan services."""
    RUNTIME.mkdir(parents=True, exist_ok=True)
    with (RUNTIME / "launcher.lock").open("a") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError("另一個啟停指令正在執行，請待它完成後再試。") from None
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def ensure_env(path: Path, port: int) -> None:
    if path.is_file():
        return
    if path != ROOT / ".env":
        raise RuntimeError(f"指定的設定檔不存在：{path}")
    run(
        [
            sys.executable,
            str(SCRIPT_DIR / "create-demo-env.py"),
            "--output",
            str(path),
            "--port",
            str(port),
        ]
    )


def read_env(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise RuntimeError(
            f"找不到設定檔：{path}\n"
            f"請先執行 python3 {shlex.quote(str(SCRIPT_DIR / 'create-demo-env.py'))} "
            "--port 45465"
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
    RUNTIME.mkdir(parents=True, exist_ok=True)
    with (RUNTIME / "setup.log").open("a") as log:
        subprocess.run(
            command,
            cwd=ROOT,
            env=env,
            check=True,
            stdin=subprocess.DEVNULL,
            stdout=log,
            stderr=subprocess.STDOUT,
        )


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
        run(
            [
                sys.executable,
                "-m",
                "pip",
                "--python",
                str(VENV / "bin" / "python"),
                "install",
                "-r",
                str(requirements),
            ]
        )
        marker.write_text(digest + "\n", encoding="utf-8")
    npm_digest = hashlib.sha256((ROOT / "package-lock.json").read_bytes()).hexdigest()
    npm_marker = ROOT / "node_modules" / ".futureai-lock.sha256"
    if (
        not (ROOT / "node_modules" / ".bin" / "vite").exists()
        or not npm_marker.exists()
        or npm_marker.read_text().strip() != npm_digest
    ):
        print("安裝前端套件…", flush=True)
        run(["npm", "ci"])
        npm_marker.write_text(npm_digest + "\n")


def pid_arguments(pid: int) -> list[str]:
    try:
        raw = Path(f"/proc/{pid}/cmdline").read_bytes()
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        return []
    return [part.decode(errors="replace") for part in raw.split(b"\0") if part]


def pid_command(pid: int) -> str:
    return " ".join(pid_arguments(pid))


def process_cwd(pid: int) -> Path | None:
    try:
        return Path(f"/proc/{pid}/cwd").resolve(strict=True)
    except OSError:
        return None


def process_is_ours(pid: int, kind: str) -> bool:
    if pid <= 1:
        return False
    arguments = pid_arguments(pid)
    if kind == "backend":
        expected = (
            any(
                arguments[index : index + 2] == ["-m", "uvicorn"]
                for index in range(len(arguments) - 1)
            )
            and "app.main:app" in arguments
        )
    else:
        expected = (
            any(argument.endswith("/node_modules/.bin/vite") for argument in arguments)
            and "preview" in arguments
        )
    try:
        owns_group = os.getpgid(pid) == pid
        owns_session = os.getsid(pid) == pid
    except OSError:
        return False
    # After the repository directory is renamed, /proc keeps the original
    # argv text but resolves cwd to its new path. Accept either signal so a
    # launcher can still safely stop the processes it started after a move.
    root_prefix = f"{ROOT}{os.sep}"
    command_uses_root = any(
        argument == str(ROOT) or argument.startswith(root_prefix)
        for argument in arguments
    )
    cwd = process_cwd(pid)
    cwd_uses_root = cwd == ROOT
    return (
        expected
        and owns_group
        and owns_session
        and (command_uses_root or cwd_uses_root)
    )


def process_start_time(pid: int) -> str:
    try:
        # comm can contain spaces and parentheses; fields after it start at #3.
        return Path(f"/proc/{pid}/stat").read_text().rsplit(") ", 1)[1].split()[19]
    except (OSError, IndexError):
        return ""


def state_metadata() -> dict:
    try:
        raw = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except (OSError, ValueError):
        return {}


def save_state(processes: dict[str, int], args: argparse.Namespace) -> None:
    try:
        env_file = str(args.env_file.relative_to(ROOT))
    except ValueError:
        env_file = str(args.env_file)
    state = {
        **processes,
        "version": STATE_VERSION,
        "project_root": str(ROOT),
        "port": args.port,
        "backend_port": args.backend_port,
        "env_file": env_file,
        "started": {
            kind: process_start_time(pid) for kind, pid in processes.items()
        },
    }
    temporary = STATE_FILE.with_suffix(".tmp")
    temporary.write_text(json.dumps(state) + "\n", encoding="utf-8")
    temporary.replace(STATE_FILE)


def load_state() -> dict[str, int]:
    try:
        raw = state_metadata()
        return {key: int(raw[key]) for key in ("backend", "frontend") if key in raw}
    except (FileNotFoundError, KeyError, TypeError, ValueError, json.JSONDecodeError):
        return {}


def active_state() -> dict[str, int]:
    births = state_metadata().get("started", {})
    if not isinstance(births, dict):
        return {}
    return {
        kind: pid
        for kind, pid in load_state().items()
        if process_is_ours(pid, kind)
        and (kind not in births or births[kind] == process_start_time(pid))
    }


def stop_processes(*, quiet: bool = False) -> None:
    recorded = load_state()
    state = active_state()
    unverified = {
        kind: pid
        for kind, pid in recorded.items()
        if kind not in state and pid_arguments(pid)
    }
    if unverified:
        details = ", ".join(f"{kind} PID {pid}" for kind, pid in unverified.items())
        raise RuntimeError(
            f"狀態檔指向仍存在但無法安全辨識的程序（{details}）；"
            "請先確認程序後再移除 runtime/local-demo/processes.json。"
        )
    births = {kind: process_start_time(pid) for kind, pid in state.items()}
    for kind, pid in state.items():
        try:
            os.killpg(pid, signal.SIGTERM)
        except ProcessLookupError:
            continue
        if not quiet:
            print(f"停止 {kind}…", flush=True)
    deadline = time.monotonic() + 55
    while time.monotonic() < deadline and any(pid_command(pid) for pid in state.values()):
        time.sleep(0.1)
    for kind, pid in state.items():
        if process_is_ours(pid, kind) and process_start_time(pid) == births[kind]:
            os.killpg(pid, signal.SIGKILL)
    STATE_FILE.unlink(missing_ok=True)
    if not quiet:
        print("本機 Demo 已停止；資料保留在 runtime/local-demo/。")


def port_is_free(port: int) -> bool:
    with socket.socket() as listener:
        listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            listener.bind(("127.0.0.1", port))
        except OSError:
            return False
    return True


def healthy(url: str) -> bool:
    try:
        with urlopen(url, timeout=2) as response:
            return (response.status == 200
                    and response.headers.get_content_type() == "application/json"
                    and json.loads(response.read()).get("status") == "ok")
    except (URLError, TimeoutError, ConnectionError, ValueError, AttributeError):
        return False


def wait_for_health(url: str, process: subprocess.Popen[bytes], name: str, seconds: int = 90) -> None:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"{name} 啟動失敗，請查看 {RUNTIME / (name + '.log')}")
        if healthy(url):
            return
        time.sleep(0.25)
    raise RuntimeError(f"等待服務逾時：{url}")


def spawn(name: str, command: list[str], env: dict[str, str]) -> subprocess.Popen[bytes]:
    log_path = RUNTIME / f"{name}.log"
    log = log_path.open("ab", buffering=0)
    process = subprocess.Popen(
        command,
        cwd=ROOT,
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=log,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    log.close()
    return process


def start(args: argparse.Namespace) -> None:
    active = active_state()
    if active:
        if len(active) == 2 and status(quiet=True) == 0:
            print("本機 Demo 已在執行。")
            print_urls(int(state_metadata().get("port", 45465)))
            return
        raise RuntimeError("本機 Demo 僅部分執行或健康檢查失敗，請執行 restart 修復。")
    for port in (args.port, args.backend_port):
        if not port_is_free(port):
            raise RuntimeError(f"localhost:{port} 已被其他程式使用")

    RUNTIME.mkdir(parents=True, exist_ok=True)
    ensure_env(args.env_file, args.port)
    values = read_env(args.env_file)
    if args.skip_build and not (ROOT / "frontend" / "dist" / "index.html").is_file():
        raise RuntimeError("尚無前端 build；請移除 --skip-build 後啟動。")
    ensure_dependencies()
    environment = dict(os.environ)
    environment.update(values)
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
    run(
        [str(VENV / "bin" / "python"), str(ROOT / "backend" / "scripts" / "seed.py")],
        env=environment,
    )
    run(
        [
            str(VENV / "bin" / "python"),
            str(ROOT / "backend" / "scripts" / "build_index.py"),
        ],
        env=environment,
    )

    build_environment = dict(environment, VITE_API_URL="/api/v1")
    if args.skip_build:
        print("沿用 frontend/dist/；如有前端或文件更新，請移除 --skip-build。")
    else:
        print("建立前端 production build…（詳細輸出：runtime/local-demo/setup.log）", flush=True)
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
        save_state({"backend": backend.pid}, args)
        wait_for_health(
            f"http://127.0.0.1:{args.backend_port}/health", backend, "backend"
        )
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
        save_state({"backend": backend.pid, "frontend": frontend.pid}, args)
        wait_for_health(f"http://127.0.0.1:{args.port}/health", frontend, "frontend")
    except BaseException:
        for process in (frontend, backend):
            if process is not None and process.poll() is None:
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                    process.wait(timeout=55)
                except ProcessLookupError:
                    pass
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
        STATE_FILE.unlink(missing_ok=True)
        raise

    print_urls(args.port)
    stop_command = shlex.quote(str(SCRIPT_DIR / "stop.sh"))
    print(f"僅監聽 127.0.0.1；停止請執行：{stop_command}")


def print_urls(port: int) -> None:
    for name, path in (("學生", "index.html"), ("教師", "teacher.html"),
                       ("政府", "government.html"), ("評審導覽", "評審請看這/")):
        print(f"{name}：http://localhost:{port}/{path}")


def status(*, quiet: bool = False) -> int:
    state = active_state()
    metadata = state_metadata()
    checks = {kind: kind in state and healthy(f"http://127.0.0.1:{port}/health")
              for kind, port in (("backend", metadata.get("backend_port", 45466)),
                                 ("frontend", metadata.get("port", 45465)))}
    if not quiet:
        for kind, ok in checks.items():
            print(f"{kind}: {'healthy' if ok else '未執行或無法正常回應'}")
        if all(checks.values()):
            print_urls(int(metadata.get("port", 45465)))
        print(f"Log：{RUNTIME}")
    return 0 if all(checks.values()) else 1


def logs(service: str, lines: int) -> None:
    for name in (("setup", "frontend", "backend") if service == "all" else (service,)):
        path = RUNTIME / f"{name}.log"
        print(f"[{name}] {path}")
        if path.exists():
            with path.open(errors="replace") as handle:
                print("".join(deque(handle, maxlen=lines)), end="")
        else:
            print("尚無 log。")


def env_file_from_state(previous: dict) -> Path:
    stored = Path(str(previous.get("env_file", ".env"))).expanduser()
    if not stored.is_absolute():
        return ROOT / stored

    previous_root_value = previous.get("project_root")
    if previous_root_value:
        previous_root = Path(str(previous_root_value)).expanduser()
        try:
            relative = stored.relative_to(previous_root)
        except ValueError:
            pass
        else:
            return ROOT / relative
    return stored


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action",
        choices=("start", "stop", "restart", "status", "logs"),
        nargs="?",
        default="start",
    )
    parser.add_argument("--port", type=int, help="前端 port，預設 45465；restart 沿用上次設定")
    parser.add_argument("--backend-port", type=int, help="後端 port，預設 45466；restart 沿用上次設定")
    parser.add_argument(
        "--env-file",
        type=Path,
        help="私有設定檔；預設專案根目錄 .env，相對路徑也以專案根目錄為準",
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="沿用上次前端 build（不套用前端／文件變更）",
    )
    parser.add_argument(
        "--service",
        choices=("all", "setup", "frontend", "backend"),
        default="all",
        help="logs 顯示的服務",
    )
    parser.add_argument("--lines", type=int, default=40, help="logs 每個服務顯示的行數")
    args = parser.parse_args()
    previous = state_metadata() if args.action == "restart" else {}
    args.port = (
        args.port if args.port is not None else int(previous.get("port", 45465))
    )
    args.backend_port = (
        args.backend_port
        if args.backend_port is not None
        else int(previous.get("backend_port", 45466))
    )
    args.env_file = args.env_file or env_file_from_state(previous)
    if not 1 <= args.port <= 65535 or not 1 <= args.backend_port <= 65535:
        parser.error("port 必須介於 1 到 65535")
    if args.port == args.backend_port:
        parser.error("前端與後端 port 不可相同")
    if args.lines < 1:
        parser.error("--lines 必須大於 0")
    args.env_file = args.env_file.expanduser()
    if not args.env_file.is_absolute():
        args.env_file = ROOT / args.env_file
    args.env_file = args.env_file.resolve()
    return args


def main() -> None:
    args = parse_args()
    try:
        if args.action == "status":
            raise SystemExit(status())
        if args.action == "logs":
            logs(args.service, args.lines)
            return
        with lifecycle_lock():
            if args.action in {"stop", "restart"}:
                stop_processes()
            if args.action in {"start", "restart"}:
                start(args)
    except KeyboardInterrupt:
        print("啟動已取消。", file=sys.stderr)
        raise SystemExit(130) from None
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print(f"錯誤：{error}", file=sys.stderr)
        logs_command = shlex.quote(str(SCRIPT_DIR / "local-demo.py"))
        print(f"詳細紀錄：python3 {logs_command} logs", file=sys.stderr)
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
