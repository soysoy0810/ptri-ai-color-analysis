#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/ai-service"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  # shellcheck disable=SC1091
  . .venv/bin/activate
  pip install -r requirements.txt
else
  # shellcheck disable=SC1091
  . .venv/bin/activate
fi
exec uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
