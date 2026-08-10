# Contributing

## Setup (all developers)

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/ptri-ai-kiosk
cp .env.example .env

# 1) Database (SQLite by default — no MySQL required)
php scripts/db_migrate.php

# Optional MySQL (start MySQL in XAMPP first)
# DB_DRIVER=mysql php scripts/db_migrate.php --driver=mysql

# 2) AI service
./scripts/start-ai.sh

# 3) Frontend
./scripts/start-frontend.sh
```

## Folder map

```
ptri-ai-kiosk/
├── frontend/          # React kiosk UI
├── backend/           # PHP API (Controllers / Services / Repositories)
├── ai-service/        # Python FastAPI AI
├── admin/             # Admin shell
├── shared/            # Shared catalog + API contracts
├── database/          # Migrations + seeds + sqlite file
├── docs/              # Team docs
└── scripts/           # Start / migrate helpers
```

## Before you push

- Keep API field names in sync with `shared/contracts/api.md`
- If catalog data changes, edit `shared/catalog/*.json` then re-run `php scripts/db_migrate.php`
- Do not store raw face images in DB or disk
