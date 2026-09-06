"""Serve the built frontend and API from one RunPod HTTP port."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import runpy
import subprocess
import sys
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "frontend" / "dist"


def configure(env_file: Path) -> None:
    if not env_file.is_file():
        if env_file != ROOT / ".env":
            raise RuntimeError("The requested environment file does not exist.")
        subprocess.run(
            [sys.executable, str(ROOT / "scripts/create-demo-env.py")], check=True
        )
    # Match the repository's raw env format; never evaluate it as shell code.
    for number, raw in enumerate(env_file.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            raise RuntimeError(f"Invalid environment file entry on line {number}.")
        os.environ.setdefault(key, value)
    os.environ.setdefault("APP_ENV", "production")
    os.environ.setdefault("RUNTIME_MODE", "offline_demo")
    os.environ.setdefault("APP_DATA_DIR", str(ROOT / "runtime/runpod/data"))
    os.environ.setdefault("CHROMA_PATH", str(ROOT / "runtime/runpod/chroma"))
    os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, help="HTTP port (default: WEB_PORT or 8080)")
    parser.add_argument(
        "--env-file", type=Path,
        default=Path(os.environ.get("FUTUREAI_ENV_FILE", str(ROOT / ".env"))),
    )
    args = parser.parse_args()
    if not (DIST / "index.html").is_file():
        parser.error("Missing frontend/dist. Use the RunPod archive or run npm run build.")
    env_file = args.env_file.expanduser()
    if not env_file.is_absolute():
        env_file = ROOT / env_file
    configure(env_file.resolve())
    port = args.port if args.port is not None else int(os.environ.get("WEB_PORT", "8080"))
    if not 1 <= port <= 65535:
        parser.error("HTTP port must be between 1 and 65535.")
    pod_id = os.environ.get("RUNPOD_POD_ID")
    if pod_id:
        origin = f"https://{pod_id}-{port}.proxy.runpod.net"
        origins = os.environ.get("FRONTEND_ORIGIN", "").split(",")
        origins = [item.strip().rstrip("/") for item in origins if item.strip()]
        os.environ["FRONTEND_ORIGIN"] = ",".join(dict.fromkeys([*origins, origin]))

    sys.path.insert(0, str(ROOT / "backend"))
    prepare = runpy.run_path(str(ROOT / "deploy/backend-entrypoint.py"))["prepare"]
    print("Preparing database and retrieval index…", flush=True)
    try:
        prepare()
    except Exception as exc:
        # Provider errors can contain private configuration; keep logs sanitized.
        raise RuntimeError(
            f"Backend preparation failed ({type(exc).__name__}). "
            "Check the environment file, provider configuration and writable data paths."
        ) from None

    import uvicorn
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles
    from app.main import app

    class FrontendFiles(StaticFiles):
        async def get_response(self, path, scope):
            response = await super().get_response(path, scope)
            if response.status_code in {301, 302, 307, 308}:
                # Relative redirects retain HTTPS at the RunPod proxy without
                # trusting forwarded client headers for authentication limits.
                target = urlsplit(response.headers["location"])
                response.headers["location"] = target.path + (
                    f"?{target.query}" if target.query else ""
                )
            if response.headers.get("content-type", "").startswith("text/html"):
                response.headers["Cache-Control"] = "no-cache"
            return response

    async def frontend_entry():
        return FileResponse(DIST / "index.html", headers={"Cache-Control": "no-cache"})

    # React Router's extensionless URLs must also work on direct visits/reloads.
    for path in (
        "/chat", "/chat/learning", "/chat/resource", "/resources", "/alerts",
        "/teacher", "/government",
    ):
        app.add_api_route(path, frontend_entry, methods=["GET"], include_in_schema=False)
    app.mount("/", FrontendFiles(directory=DIST, html=True), name="frontend")
    print(f"FutureAI listening on {args.host}:{port}; health check: /health", flush=True)
    uvicorn.run(
        app, host=args.host, port=port, workers=1, proxy_headers=False,
        access_log=False, timeout_graceful_shutdown=55,
    )


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, ValueError, subprocess.CalledProcessError) as exc:
        # RuntimeError messages above are authored here; other errors stay sanitized.
        message = str(exc) if type(exc) is RuntimeError else type(exc).__name__
        print(f"RunPod startup failed: {message}", file=sys.stderr)
        sys.exit(1)
