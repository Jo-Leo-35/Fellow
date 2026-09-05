"""Create private server settings without printing secrets or replacing files."""

from __future__ import annotations

import argparse
import json
import os
import secrets
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path(".env"))
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    template = Path(__file__).resolve().parents[1] / ".env.example"
    codes = {
        role: secrets.token_urlsafe(32)
        for role in ("student_demo", "teacher_demo", "government_demo")
    }
    replacements = {
        "DEMO_ACCESS_CODES": json.dumps(codes, separators=(",", ":")),
        "WEB_PORT": str(args.port),
        "FRONTEND_ORIGIN": f"http://localhost:{args.port},http://127.0.0.1:{args.port}",
    }
    lines = []
    for line in template.read_text(encoding="utf-8").splitlines():
        key = line.partition("=")[0]
        lines.append(f"{key}={replacements[key]}" if key in replacements else line)
    try:
        descriptor = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        parser.error("output already exists; it was not changed")
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
    print(f"Created private Demo configuration: {args.output}")
    print(
        "Open this file locally to obtain the three access codes. No secrets were printed."
    )


if __name__ == "__main__":
    main()
