# Self-hosted VTON GPU servers

The kiosk Mac (Apple Silicon, 16 GB, no NVIDIA) runs FastAPI, camera, skin
analysis, garment prep, and routing. **CUDA VTON models run on a separate GPU.**

Default kiosk setting:

```
VTON_PROVIDER=catvton
VTON_FALLBACK_PROVIDER=huggingface_idm_vton
VTON_LOCAL_URL=http://<gpu-box>:8010
```

`8001` is the kiosk FastAPI port. The GPU server is **8010**.

Preferred model for a separate box: **CatVTON** (authors: ~8 GB VRAM at
1024×768 bf16). IDM-VTON remains a fallback (~18 GB+ VRAM per the authors).

Neither CatVTON nor IDM-VTON invents a realistic full-body person from a
face-only crop. They transfer a garment onto the supplied person photo.

## CatVTON (recommended GPU server)

Official code: https://github.com/Zheng-Chong/CatVTON  
Weights: https://huggingface.co/zhengchong/CatVTON (download once; this is
**not** the ZeroGPU Space used for every generation).

License: **CC BY-NC-SA 4.0** (non-commercial). Event/commercial use needs the
authors' permission.

### NVIDIA PC

```bash
git clone https://github.com/Zheng-Chong/CatVTON.git
cd CatVTON
python3.10 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install fastapi uvicorn huggingface_hub
# Copy catvton_server.py into this repo so `from model.pipeline import ...` works
cp /path/to/ai-service/local_vton_server/catvton_server.py .
python catvton_server.py    # 0.0.0.0:8010
```

Needs about **8 GB NVIDIA VRAM** (T4, 3070, 3080, 4070, etc.).

### Temporary free GPU (Google Colab)

Colab T4 (15 GB) is large enough for CatVTON. Sessions disconnect, GPU type
varies, and it is **not reliable for a live event kiosk**. Use
`colab_catvton.py` in this folder: it starts `catvton_server.py` and prints a
public URL. Paste that URL into the kiosk:

```
VTON_PROVIDER=catvton
VTON_LOCAL_URL=https://<colab-tunnel>
```

Official CatVTON authors noted Colab `app.py` localhost forwarding issues
(GitHub issue #41). Our server is HTTP `/generate`, so Colab only needs a
tunnel (cloudflared / ngrok), not a browser on the GPU machine.

### Point the kiosk at CatVTON

```
python scripts/set_vton_local_url.py http://<gpu-box-ip>:8010
# or a Colab tunnel:
python scripts/set_vton_local_url.py https://xxxx.trycloudflare.com
```

Then restart `ph.ptri.ai-color` and run:

```
python scripts/test_catvton_direct.py
```

That script saves `/tmp/ptri-catvton-direct.png`. HTTP 200 alone is not success.

```bash
curl http://127.0.0.1:8001/tryon/status
```

### CatVTON contract

```jsonc
// POST /generate
{
  "person_image": "data:image/jpeg;base64,...",
  "garment_image": "data:image/jpeg;base64,...",  // isolated garment, textile already applied
  "garment_mask": "data:image/png;base64,...",    // person clothing-replace mask from the kiosk
  "category": "upper_body",
  "cloth_type": "upper",                         // upper | lower | overall
  "steps": 50,
  "guidance": 2.5,
  "seed": 42
}

// 200
{ "ok": true, "image": "data:image/png;base64,...", "output_size": [768, 1024], "model": "CatVTON" }
```

---

# Self-hosted IDM-VTON server

Runs IDM-VTON on **our own GPU machine**. No API tokens, no billing, no public
Space. The kiosk talks to this over the LAN via `VTON_PROVIDER=local_server`.

## This does not run on the kiosk Mac

Checked on the current kiosk (Apple M5, 16 GB unified memory):

| Requirement | Kiosk Mac |
|---|---|
| CUDA GPU | none (Apple Silicon, no NVIDIA toolchain) |
| Weights on disk | 29.4 GB (UNet 12 GB + encoder 10.3 GB) |
| Memory to load fp16 | ~22 GB vs 16 GB shared with macOS/XAMPP/browser |
| `torch==2.8.0` | needs Python 3.10+; kiosk venv is 3.9.6 |
| DensePose / detectron2 | CUDA-oriented, does not build cleanly on arm64 macOS |

So this server belongs on a separate Linux + NVIDIA box. Target roughly a
**24 GB card** (3090/4090/A5000 or better); 16 GB can work only with
CPU offload and is markedly slower.

## Why it wraps the upstream repo

The IDM-VTON pipeline is not just the diffusion weights — it also needs
DensePose, human parsing and OpenPose preprocessing. The upstream Space
vendors all of that and has it working. Re-implementing it by hand is how you
get subtly wrong masks and poor output, so this server clones the upstream
repo and calls its existing, proven `start_tryon` entry point. We own the
hardware and the weights; we don't re-derive the pipeline.

## Setup on the GPU machine

```bash
# 1. Get the upstream pipeline (vendors densepose/detectron2/preprocess)
git lfs install
git clone https://huggingface.co/spaces/yisol/IDM-VTON
cd IDM-VTON

# 2. Environment (Python 3.10+)
python3.10 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install fastapi uvicorn

# 3. Weights: 29.4 GB, public repo — no token needed
python -c "
from huggingface_hub import snapshot_download
snapshot_download('yisol/IDM-VTON', local_dir='ckpt/IDM-VTON')
"

# 4. Copy this server in and run it
cp /path/to/ai-service/local_vton_server/server.py .
python server.py            # listens on 0.0.0.0:8010
```

## Point the kiosk at it

In `ai-service/.env`:

```
VTON_PROVIDER=local_server
VTON_LOCAL_URL=http://<gpu-box-ip>:8010
```

Restart the AI service. Confirm with:

```bash
curl http://127.0.0.1:8001/tryon/runtime     # server_reachable must be true
```

## Contract

The kiosk sends `POST /tryon` and expects `GET /health`. It already sends the
person image cropped to IDM-VTON's 3:4 frame, so do not re-crop.

```jsonc
// POST /tryon
{
  "person_image":  "data:image/jpeg;base64,...",  // already 768x1024
  "garment_image": "data:image/jpeg;base64,...",  // cutout on white
  "garment_description": "Modern Filipiniana, worn as a top, ...",
  "category": "upper_body",
  "steps": 40,
  "seed": 42
}

// 200 OK
{ "ok": true, "image": "data:image/png;base64,..." }

// failure — kiosk shows `message` verbatim, so keep it visitor-safe
{ "ok": false, "message": "..." }
```

`server.py` in this folder implements exactly that. It is **untested here** —
there is no GPU on the kiosk to run it against. The kiosk-side half of the
contract *is* verified end to end against a stub server.
