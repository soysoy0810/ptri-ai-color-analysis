# PTRI AI Color Analysis Kiosk

Touchscreen-first DOST–PTRI kiosk: React + TypeScript + Tailwind UI, Laravel API, MySQL/SQLite, Python FastAPI AI.

## Architecture (Option A — Local Kiosk)

```
PTRI KIOSK
    │
    ▼
React App (Touchscreen UI)
    │
    ▼
Laravel REST API (+ Admin later)
    ├── MySQL / SQLite
    └── Python FastAPI AI (MediaPipe pretrained face model, swappable)
```

The React app is a web app opened in **browser kiosk / full-screen mode** so visitors never see tabs, address bar, or desktop. See [docs/KIOSK_MODE.md](docs/KIOSK_MODE.md).

## Team folders

| Path | Tech | Owner |
|---|---|---|
| `frontend/` | React + TS + Tailwind | Dev 1–2 |
| `backend/` | Laravel 12 API | Dev 3–4 |
| `ai-service/` | FastAPI + MediaPipe | Dev 5 |
| `admin/` | Admin shell | Dev 6 |
| `shared/` | Catalog + API contracts | All |
| `docs/` | Architecture / team / kiosk | Dev 7 |

## Quick start

```bash
# 1) Backend
cd backend
cp .env.example .env   # if needed
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000

# 2) AI
./scripts/start-ai.sh

# 3) Frontend
cd frontend
cp .env.example .env   # VITE_API_URL=http://127.0.0.1:8000/api
npm install
npm run dev -- --host
```

Or all-in-one:

```bash
./scripts/start-kiosk-stack.sh
```

Open **http://127.0.0.1:5173** (dev) or the built `frontend/dist` URL in kiosk mode.

## MySQL (production / XAMPP)

In `backend/.env`:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ptri_ai_kiosk
DB_USERNAME=root
DB_PASSWORD=
```

Then:

```bash
php artisan migrate --seed
```

Default local setup uses **SQLite** so the team can develop without MySQL running.

## How it works (System Guide Section A — exact flow)

1. HOME → 2. CAMERA GUIDE → 3. LIGHTING CHECK → 4. LIVE SCAN → 5. AI ANALYZING → 6. TOP 20 COLORS → 7. CHOOSE TOP → 8. CHOOSE CATEGORY → 9. CHOOSE DESIGN → 10. CHOOSE FABRIC → 11. CHOOSE BACKGROUND → 12. PREVIEW LOOK → 13. AI RECOMMENDATION → 14. GET YOUR RESULT → 15. THANK YOU (auto-reset)

See [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md).

## AI model strategy

- Do **not** train from scratch for MVP
- Uses pretrained **MediaPipe Face Detection** when installed
- Falls back to center-crop detector if MediaPipe is unavailable
- Swap providers in `ai-service/app/services/face_detector.py`

## Docs

- [docs/TEAM.md](docs/TEAM.md)
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/KIOSK_MODE.md](docs/KIOSK_MODE.md)
- [shared/contracts/api.md](shared/contracts/api.md)
