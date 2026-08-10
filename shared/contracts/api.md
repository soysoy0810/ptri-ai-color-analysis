# Shared API Contract

Kiosk visitor flow follows System Guide Section A (15 steps). See `docs/HOW_IT_WORKS.md`.

All services use the same field names (`snake_case` in JSON).

## Envelope

Success:
```json
{ "ok": true, "data": {} }
```

Error:
```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

## Endpoints

| Method | Path | Owner |
|---|---|---|
| GET | `/api/health` | backend |
| GET | `/api/catalog` | backend |
| POST | `/api/sessions` | backend |
| PATCH | `/api/sessions/{id}` | backend |
| POST | `/api/sessions/{id}/complete` | backend |
| POST | `/api/sessions/{id}/email` | backend |
| POST | `/api/analyze` | backend → ai-service |
| POST | `/api/staff-alerts` | backend |
| GET | `/api/results/{token}` | backend |
| GET | `/health` | ai-service |
| GET | `/palette` | ai-service |
| POST | `/analyze` | ai-service |

## Analyze request/response

Request:
```json
{
  "session_id": "uuid",
  "image": "data:image/jpeg;base64,..."
}
```

Response `data`:
```json
{
  "session_id": "uuid",
  "face_detected": true,
  "lighting": { "mean_luma": 120.1, "contrast": 32.4, "status": "good" },
  "sample_rgb": { "r": 180.0, "g": 140.0, "b": 120.0 },
  "top20": [
    { "id": "c03", "name": "Soft Coral", "hex": "#E8A598", "score": 91.2, "delta_e": 6.4 }
  ],
  "model": { "name": "ptri-mvp-color-ranker", "version": "0.1.0" }
}
```

## Session create

Request:
```json
{
  "full_name": "Juan Dela Cruz",
  "age_range": "25–34",
  "gender": "male",
  "email": "optional@email.com"
}
```

## Shared catalog source

Canonical seed files live in `shared/catalog/*.json`.
Backend DB seeders and AI palette load from these files.
