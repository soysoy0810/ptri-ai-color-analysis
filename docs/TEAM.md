# Team Organization

7-developer ownership aligned with the PTRI documentation plan.

| Developer | Branch | Owns |
|---|---|---|
| Dev 1 | `feature/frontend` | `frontend/src/features/*`, UI shell |
| Dev 2 | `feature/camera` | Camera, preview, accessibility |
| Dev 3 | `feature/backend-api` | `backend/app`, `backend/routes` |
| Dev 4 | `feature/database` | `database/`, repositories, seeders |
| Dev 5 | `feature/ai-service` | `ai-service/` |
| Dev 6 | `feature/admin` | `admin/`, QA, acceptance |
| Dev 7 | `feature/devops` | `scripts/`, deploy, env, CI |

## Uniform conventions

1. **JSON fields:** `snake_case` everywhere (`full_name`, `session_id`, `category_id`).
2. **API envelope:** `{ "ok": true, "data": ... }` / `{ "ok": false, "error": { "code", "message" } }`.
3. **Catalog source of truth:** `shared/catalog/*.json` → seeded into DB → served by `/api/catalog`.
4. **Domain names match across stacks:**
   - `sessions`, `catalog`, `analyze`, `colors`, `fabrics`, `designs`, `backgrounds`
5. **Do not commit secrets.** Use `.env` (see `.env.example`).

## Workflow

```
main
  ↑ PR
feature/<area>
  ↑ local work
```

1. Pull `main`
2. Create/use your feature branch
3. Keep changes inside your owned folders when possible
4. Update `shared/contracts/api.md` if you change an endpoint
5. Open a PR for review
