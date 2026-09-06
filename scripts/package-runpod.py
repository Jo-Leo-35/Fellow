"""Build and package the current checkout for a RunPod upload without private state."""

from __future__ import annotations

import gzip
import hashlib
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "dist" / "FutureAI-runpod.tar.gz"
FRONTEND_BUILD = Path("frontend/dist")
REQUIRED_FILES = (
    ".env.example",
    "backend/requirements.txt",
    "deploy/backend-entrypoint.py",
    "deploy/runpod.py",
    "deploy/RUNPOD.md",
    "scripts/create-demo-env.py",
    "scripts/package-runpod.py",
    "scripts/setup-runpod.sh",
    "scripts/start-runpod.sh",
    "frontend/dist/index.html",
)
EXCLUDED_DIRECTORIES = {
    ".git",
    ".aws",
    ".azure",
    ".ssh",
    ".cache",
    ".codex-runs",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".screenshots",
    "__pycache__",
    "backups",
    "chroma",
    "dist",
    "env",
    "logs",
    "node_modules",
    "playwright-report",
    "runtime",
    "test-results",
    "uploads",
    "venv",
}
PRIVATE_SUFFIXES = {".key", ".pem", ".p12", ".pfx", ".jks", ".keystore"}
GENERATED_SUFFIXES = {".log", ".pyc", ".pyo", ".tsbuildinfo"}


def excluded(path: Path, *, built_frontend: bool = False) -> bool:
    """Apply exclusions even to tracked files; only the built frontend may use dist/."""
    parts = path.parts
    if path.is_absolute() or ".." in parts:
        return True
    for index, part in enumerate(parts[:-1]):
        if built_frontend and index == 1 and parts[:2] == FRONTEND_BUILD.parts:
            continue
        if part.lower() in EXCLUDED_DIRECTORIES or part.lower().startswith(".venv"):
            return True
    name = path.name.lower()
    if name == ".env.example":
        return False
    if name == ".env" or name.startswith(".env.") or name.endswith(".env"):
        return True
    if name in {"credentials", "secrets", ".npmrc", ".pypirc", ".netrc"}:
        return True
    if name.startswith(("id_rsa", "id_dsa", "id_ecdsa", "id_ed25519", "credentials.", "secrets.")):
        return True
    if path.suffix.lower() in PRIVATE_SUFFIXES | GENERATED_SUFFIXES:
        return True
    if name.endswith((".db", ".sqlite", ".sqlite3")):
        return True
    if any(marker in name for marker in (".db-", ".sqlite-", ".sqlite3-", ".log.")):
        return True
    return False


def regular_file(path: Path) -> bool:
    """Never follow a file or directory symlink into an archive."""
    current = ROOT
    for part in path.parts:
        current = current / part
        if current.is_symlink():
            return False
    return current.is_file()


def package_files() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
    )
    candidates = {
        Path(os.fsdecode(raw)) for raw in result.stdout.split(b"\0") if raw
    }
    selected = {
        path for path in candidates if not excluded(path) and regular_file(path)
    }
    for absolute in (ROOT / FRONTEND_BUILD).rglob("*"):
        path = absolute.relative_to(ROOT)
        if not excluded(path, built_frontend=True) and regular_file(path):
            selected.add(path)
    missing = [name for name in REQUIRED_FILES if Path(name) not in selected]
    if missing:
        raise RuntimeError("Required package files are missing: " + ", ".join(missing))
    return sorted(selected, key=lambda path: path.as_posix())


def write_archive(paths: list[Path]) -> str:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=".FutureAI-runpod-", dir=OUTPUT.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as raw:
            # Normalize ownership while retaining mtimes for HTTP cache validators.
            with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as compressed:
                with tarfile.open(fileobj=compressed, mode="w", format=tarfile.PAX_FORMAT) as archive:
                    for path in paths:
                        absolute = ROOT / path
                        if not regular_file(path):
                            raise RuntimeError("A package file changed during archiving; run again.")
                        info = archive.gettarinfo(absolute, arcname=f"FutureAI/{path.as_posix()}")
                        info.uid = info.gid = 0
                        info.uname = info.gname = ""
                        info.mtime = int(info.mtime)
                        info.mode = 0o755 if info.mode & 0o111 else 0o644
                        info.pax_headers = {}
                        with absolute.open("rb") as source:
                            archive.addfile(info, source)
        with temporary.open("rb") as source:
            digest = hashlib.file_digest(source, "sha256").hexdigest()
        os.chmod(temporary, 0o644)
        temporary.replace(OUTPUT)
        checksum = OUTPUT.with_name(OUTPUT.name + ".sha256")
        checksum.write_text(f"{digest}  {OUTPUT.name}\n", encoding="ascii")
        return digest
    finally:
        temporary.unlink(missing_ok=True)


def main() -> None:
    environment = dict(os.environ, VITE_API_URL="/api/v1")
    print("Building the frontend for the same-origin /api/v1 endpoint…", flush=True)
    subprocess.run(["npm", "run", "build"], cwd=ROOT, env=environment, check=True)
    paths = package_files()
    digest = write_archive(paths)
    print(f"Created {OUTPUT} ({OUTPUT.stat().st_size / 1024 / 1024:.1f} MiB, {len(paths)} files)")
    print(f"SHA-256: {digest}")
    print(f"Checksum file: {OUTPUT.name}.sha256")


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, subprocess.CalledProcessError) as exc:
        print(f"RunPod packaging failed: {exc}", file=sys.stderr)
        sys.exit(1)
