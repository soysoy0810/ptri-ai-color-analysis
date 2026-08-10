#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

PHP_BIN="${PHP_BIN:-/Applications/XAMPP/xamppfiles/bin/php}"

echo "→ Migrating / seeding Laravel DB"
cd "$ROOT/backend"
$PHP_BIN artisan migrate --force
$PHP_BIN artisan db:seed --force

echo "→ Starting Laravel API on :8000"
$PHP_BIN artisan serve --host=127.0.0.1 --port=8000 >/tmp/ptri-laravel.log 2>&1 &
echo $! >/tmp/ptri-laravel.pid

echo "→ Starting AI service on :8001"
cd "$ROOT/ai-service"
# shellcheck disable=SC1091
. .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8001 >/tmp/ptri-ai.log 2>&1 &
echo $! >/tmp/ptri-ai.pid

echo "→ Starting React kiosk UI on :5173"
cd "$ROOT/frontend"
npm run dev -- --host --port 5173 >/tmp/ptri-frontend.log 2>&1 &
echo $! >/tmp/ptri-frontend.pid

echo
echo "Kiosk stack ready:"
echo "  UI      http://127.0.0.1:5173"
echo "  Laravel http://127.0.0.1:8000/api/health"
echo "  AI      http://127.0.0.1:8001/health"
echo
echo "Open the UI URL in browser kiosk mode for the exhibition PC."
