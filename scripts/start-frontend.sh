#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
  npm install
fi
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi
exec npm run dev -- --host
