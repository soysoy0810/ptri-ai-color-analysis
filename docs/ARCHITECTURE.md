# Architecture

## Layers

| Layer | Path | Role |
|---|---|---|
| Frontend | `frontend/` | Touchscreen React UI |
| Backend | `backend/` | REST API, sessions, catalog, email queue |
| AI | `ai-service/` | Face/color analysis |
| Shared | `shared/` | Catalog JSON + API contracts |
| Database | `database/` | Schema + seeds |

## Request flow

1. Frontend collects profile → `POST /api/sessions`
2. Frontend captures image → `POST /api/analyze`
3. Backend forwards image to AI `/analyze` (no image persistence)
4. AI returns Top 20 using `shared/catalog/palette.json`
5. Frontend completes selections → `POST /api/sessions/{id}/complete`
6. Optional email → `POST /api/sessions/{id}/email`

## Uniform module names

| Domain | Frontend feature | Backend | AI |
|---|---|---|---|
| Sessions | `shared/hooks` | `SessionController` / `SessionService` | `session_id` field |
| Catalog | `data/catalog` | `CatalogController` | `core/palette` |
| Analyze | `features/analysis` | `AnalyzeController` | `services/color_analysis` |
| Colors | `features/colors` | `colors` table | `top20` |
| Fabrics | `features/fabric` | `fabrics` table | — |

## Privacy

- Raw camera images are processed in memory only
- DB stores scores/selections, not face photos
