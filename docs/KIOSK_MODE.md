# How the web app becomes a kiosk

The React app is still a web application. The kiosk PC opens it in **full-screen kiosk mode** so visitors only see the PTRI UI (no browser chrome, desktop, or taskbar).

```
PTRI KIOSK PC
    │
    ▼
React Touchscreen UI  ──►  Laravel API  ──►  MySQL
                              │
                              └──►  Python FastAPI AI
```

## Option A — Local Kiosk (recommended MVP)

Run everything on the kiosk mini-PC:

1. MySQL (or SQLite for lab setup)
2. Laravel API (`php artisan serve` or Apache/Nginx)
3. FastAPI AI (`./scripts/start-ai.sh`)
4. React build served locally or via `npm run dev` during development
5. Windows/macOS kiosk browser auto-start

### Windows Assigned Access / Kiosk mode

1. Create a dedicated Windows user `ptri-kiosk`
2. Set Edge/Chrome to open on login:
   - Edge: `--kiosk http://127.0.0.1:5173` (dev) or `http://127.0.0.1/ptri-ai-kiosk/frontend/dist/`
   - Chrome: same `--kiosk` flag
3. Disable gestures that exit kiosk where possible
4. Auto-start Laravel + AI via Task Scheduler / NSSM services

### Helper script (macOS / Linux lab)

```bash
./scripts/start-kiosk-stack.sh
```

## Option B — Centralized multi-kiosk

Kiosks run only the React UI (or thin client browser). Laravel + MySQL + AI run on PTRI servers.

Use when multiple exhibition units share one catalog/admin.

## Session reset

The React app clears visitor state:

- After Thank You (auto ~6s)
- After 3 minutes idle
- Operator “Call Staff” / restart flow

Raw face images are not stored by Laravel.
