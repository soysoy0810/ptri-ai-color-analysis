# How It Works — System Guide Section A

Exact 15-step kiosk visitor flow (source of truth for frontend `STEPS`):

| # | Step | Screen |
|---|---|---|
| 1 | HOME | Welcome / Touch to Start |
| 2 | CAMERA GUIDE | Face positioning instructions |
| 3 | LIGHTING CHECK | Auto lighting & camera quality |
| 4 | LIVE SCAN | Capture face |
| 5 | AI ANALYZING | Color analysis progress |
| 6 | TOP 20 COLORS | Best-fit palette |
| 7 | CHOOSE TOP | Top 5 / Top 10 / Custom |
| 8 | CHOOSE CATEGORY | Uniform, Casual, Smart Casual, Formal, Active Wear, Fabrics Only |
| 9 | CHOOSE DESIGN | Clothing design |
| 10 | CHOOSE FABRIC | PTRI textile/fabric |
| 11 | CHOOSE BACKGROUND | Preview environment |
| 12 | PREVIEW LOOK | Outfit + color preview |
| 13 | AI RECOMMENDATION | Personalized summary |
| 14 | GET YOUR RESULT | Email or QR |
| 15 | THANK YOU | Auto session reset for next visitor |

Architecture (Section C): React Kiosk → Laravel API → MySQL + Python FastAPI AI (+ Admin Panel).

Deployment (Section B): Option 1 Local Kiosk recommended for Version 1 — see `docs/KIOSK_MODE.md`.
