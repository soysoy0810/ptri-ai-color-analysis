#!/usr/bin/env bash
# Start PTRI kiosk stack on MacBook Air (Apple Silicon, 16 GB).
#
# Uses XAMPP for Laravel/MySQL (already at localhost/ptri-AI-color-analysis/...)
# and starts the Python AI service locally. Virtual try-on uses Hugging Face
# (remote GPU) — IDM-VTON cannot run on this Mac; see docs/MAC_SETUP.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
PHP_BIN="${PHP_BIN:-/Applications/XAMPP/xamppfiles/bin/php}"
AI_PID_FILE="/tmp/ptri-ai.pid"
AI_LOG="/tmp/ptri-ai.log"
FRONTEND_PID_FILE="/tmp/ptri-frontend.pid"
FRONTEND_LOG="/tmp/ptri-frontend.log"

ai_running() {
  curl -sf http://127.0.0.1:8001/health >/dev/null 2>&1
}

frontend_running() {
  curl -sf http://127.0.0.1:5173/ >/dev/null 2>&1
}

start_ai() {
  local plist_src="$ROOT/scripts/ph.ptri.ai-color.plist"
  local plist_dst="$HOME/Library/LaunchAgents/ph.ptri.ai-color.plist"
  local uid
  uid="$(id -u)"

  mkdir -p "$HOME/Library/LaunchAgents"
  cp "$plist_src" "$plist_dst"

  if [ ! -d "$ROOT/ai-service/.venv" ]; then
    echo "→ Creating AI Python env"
    cd "$ROOT/ai-service"
    python3 -m venv .venv
    # shellcheck disable=SC1091
    . .venv/bin/activate
    pip install -r requirements.txt
  fi
  if [ ! -f "$ROOT/ai-service/.env" ]; then
    cp "$ROOT/ai-service/.env.example" "$ROOT/ai-service/.env"
  fi

  # KeepAlive LaunchAgent — survives Terminal/Cursor closing.
  launchctl bootout "gui/$uid/ph.ptri.ai-color" >/dev/null 2>&1 || true
  if ! launchctl bootstrap "gui/$uid" "$plist_dst"; then
    echo "→ LaunchAgent unavailable, starting uvicorn directly"
    cd "$ROOT/ai-service"
    # shellcheck disable=SC1091
    . .venv/bin/activate
    nohup uvicorn app.main:app --host 127.0.0.1 --port 8001 >"$AI_LOG" 2>&1 &
    echo $! >"$AI_PID_FILE"
  fi

  for _ in $(seq 1 30); do
    if ai_running; then
      echo "✓ AI service ready on :8001 (kept alive)"
      return
    fi
    sleep 0.4
  done
  echo "✗ AI service failed to start — see $AI_LOG"
  exit 1
}

start_frontend() {
  if frontend_running; then
    echo "✓ Frontend already running on :5173"
    return
  fi
  echo "→ Starting React dev server on :5173"
  cd "$ROOT/frontend"
  if [ ! -d node_modules ]; then
    npm install
  fi
  if [ ! -f .env ]; then
    cp .env.example .env
  fi
  nohup npm run dev -- --host 127.0.0.1 --port 5173 >"$FRONTEND_LOG" 2>&1 &
  echo $! >"$FRONTEND_PID_FILE"
  for _ in $(seq 1 30); do
    if frontend_running; then
      echo "✓ Frontend ready"
      return
    fi
    sleep 0.5
  done
  echo "✗ Frontend failed to start — see $FRONTEND_LOG"
  exit 1
}

check_xampp() {
  local api_url="http://localhost/ptri-AI-color-analysis/backend/public/api/health"
  if curl -sf "$api_url" >/dev/null 2>&1; then
    echo "✓ Laravel API (XAMPP) reachable"
  else
    echo "✗ Laravel API not reachable at $api_url"
    echo "  Start XAMPP (Apache + MySQL), then run migrations if needed:"
    echo "    cd backend && $PHP_BIN artisan migrate --seed"
    exit 1
  fi
}

check_xampp
start_ai
start_frontend

echo
echo "Mac kiosk stack ready:"
echo "  UI (dev)     http://127.0.0.1:5173"
echo "  UI (built)   http://localhost/ptri-AI-color-analysis/frontend/dist/"
echo "  Laravel API  http://localhost/ptri-AI-color-analysis/backend/public/api/health"
echo "  AI service   http://127.0.0.1:8001/health"
echo
echo "What is real on this Mac:"
echo "  • Face scan, skin tone, Top 20, background cutout — local MediaPipe"
echo "  • Garment try-on — Hugging Face IDM-VTON (not local; needs internet)"
echo "  • Accessories are not generative on this Mac (no fake PNG stamps)"
echo
echo "Logs: $AI_LOG  $FRONTEND_LOG"
echo "Stop: kill \$(cat $AI_PID_FILE) \$(cat $FRONTEND_PID_FILE) 2>/dev/null"
