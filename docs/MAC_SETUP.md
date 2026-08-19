# MacBook Air setup (Apple Silicon, 16 GB)

Skin analysis, face scan, color ranking, and background cutout run **locally**.
Realistic garment transfer does **not** run on this Mac.

## What is real on this Mac

| Feature | Where it runs | Real? |
|---|---|---|
| Face scan (live landmarks) | Browser (MediaPipe WASM) | Yes |
| Skin tone + Top 20 colors | Python AI on `:8001` (MediaPipe + Lab/ITA) | Yes |
| Background cutout | Python MediaPipe selfie segmentation | Yes |
| Virtual try-on (garment transfer) | Hugging Face IDM-VTON Space (`VTON_PROVIDER=huggingface`) | Yes, if the Space is up — not local |
| Accessories (scarf, cap, belt…) | No generative accessory model on this Mac | Unavailable (not stamped as fake wear) |

## Why local IDM-VTON is off

IDM-VTON needs roughly **22 GB NVIDIA CUDA VRAM** plus DensePose/OpenPose.
This kiosk is Apple Silicon with **16 GB unified memory** and **no CUDA**.
PyTorch is not even installed in the AI venv. Do not keep retrying a local CUDA model here.

To run true local try-on, use a separate NVIDIA box and `VTON_PROVIDER=local_server`.
See `ai-service/local_vton_server/README.md`.

Replicate (paid) stays off unless you explicitly approve it.

## One-command start

1. Open **XAMPP** → start **Apache** and **MySQL**
2. In Terminal:

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/ptri-AI-color-analysis
./scripts/start-mac.sh
```

3. Open **http://127.0.0.1:5173**

## First-time setup

```bash
# Backend DB (once)
cd backend
/Applications/XAMPP/xamppfiles/bin/php artisan migrate --seed

# AI Python env (once)
cd ../ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Frontend (once)
cd ../frontend
npm install
cp .env.example .env
```

### Frontend API URL

```
VITE_API_URL=http://localhost/ptri-AI-color-analysis/backend/public/api
```

### AI service — generative try-on

In `ai-service/.env`:

```
VTON_PROVIDER=huggingface
```

If the free Space is busy or down, the kiosk shows **Virtual try-on unavailable**.
It will not fall back to a PNG overlay presented as success.

To disable generation entirely:

```
VTON_PROVIDER=none
```

## URLs

| Service | URL |
|---|---|
| Dev UI | http://127.0.0.1:5173 |
| Built UI | http://localhost/ptri-AI-color-analysis/frontend/dist/ |
| Laravel health | http://localhost/ptri-AI-color-analysis/backend/public/api/health |
| AI health | http://127.0.0.1:8001/health |
| Try-on runtime | http://127.0.0.1:8001/tryon/runtime |

## Troubleshooting

**“Unable to analyze your photo”**  
Start the AI service: `./scripts/start-mac.sh`

**“Virtual try-on unavailable”**  
That is an honest result. Check `/tryon/runtime`, internet access, and the Hugging Face Space. Do not expect a local overlay to replace it.

**MySQL connection error**  
Start MySQL in XAMPP. Check `backend/.env` → `DB_DATABASE=ptri_ai_color_analysis`.

## Stop services

```bash
kill $(cat /tmp/ptri-ai.pid) $(cat /tmp/ptri-frontend.pid) 2>/dev/null
```
