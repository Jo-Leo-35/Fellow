#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
python_bin="${PYTHON_BIN:-python3}"

if [[ ! -f frontend/dist/index.html ]]; then
  echo '缺少 frontend/dist；請使用 RunPod 壓縮包，或先執行 npm ci && npm run build。' >&2
  exit 1
fi
"$python_bin" -c 'import sys; assert sys.version_info >= (3, 11), "需要 Python 3.11 以上，建議 3.12"'
if [[ ! -x .venv-runpod/bin/python ]]; then
  "$python_bin" -m venv .venv-runpod
fi
.venv-runpod/bin/python -m pip install -r backend/requirements.txt
echo '安裝完成。執行 bash scripts/start-runpod.sh 啟動服務。'
