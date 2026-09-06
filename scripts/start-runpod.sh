#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
if [[ ! -x .venv-runpod/bin/python ]]; then
  echo '請先執行 bash scripts/setup-runpod.sh。' >&2
  exit 1
fi
exec .venv-runpod/bin/python deploy/runpod.py "$@"
