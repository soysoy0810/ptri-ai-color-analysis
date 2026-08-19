from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[3]
SERVICE_ROOT = Path(__file__).resolve().parents[2]
SHARED_CATALOG = ROOT / "shared" / "catalog"
PALETTE_PATH = SHARED_CATALOG / "palette.json"

# Credentials live in ai-service/.env (gitignored), never in source.
load_dotenv(SERVICE_ROOT / ".env")

AI_HOST = os.getenv("AI_HOST", "127.0.0.1")
AI_PORT = int(os.getenv("AI_PORT", "8001"))
MODEL_NAME = "ptri-mvp-color-ranker"
MODEL_VERSION = "0.3.0"

# Virtual try-on provider. The kiosk frontend never selects the model.
# Aliases: huggingface_idm_vton | huggingface | catvton | local | huggingface_catvton
VTON_PROVIDER = os.getenv("VTON_PROVIDER", "none").strip().lower()
VTON_FALLBACK_PROVIDER = os.getenv("VTON_FALLBACK_PROVIDER", "").strip().lower()

# Virtual try-on (Replicate-hosted IDM-VTON).
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN", "").strip()
TRYON_MODEL = os.getenv(
    "TRYON_MODEL",
    "cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
)
TRYON_STEPS = max(20, int(os.getenv("TRYON_STEPS", "30")))

# Virtual try-on (free, via a public Hugging Face Space running IDM-VTON).
# Costs nothing and needs no card. HF_TOKEN is optional but strongly advised:
# anonymous callers share the tightest ZeroGPU quota and get queued first.
HF_VTON_SPACE = os.getenv("HF_VTON_SPACE", "yisol/IDM-VTON").strip()
HF_TOKEN = os.getenv("HF_TOKEN", "").strip()

# Tried in order, so one Space being cold or out of quota isn't a dead end.
# Only IDM-VTON-derived Spaces belong here — the provider calls them with
# IDM-VTON's exact /tryon signature, and other VTON demos (CatVTON, OOTDiffusion)
# expose incompatible endpoints. Every public mirror was erroring or paused when
# this was written, so the default is the upstream Space alone and resilience
# comes from retrying it.
HF_VTON_SPACES = [
    s.strip() for s in os.getenv("HF_VTON_SPACES", HF_VTON_SPACE).split(",") if s.strip()
]
HF_VTON_ATTEMPTS = int(os.getenv("HF_VTON_ATTEMPTS", "1"))
HF_VTON_BACKOFF = float(os.getenv("HF_VTON_BACKOFF", "1"))
HF_VTON_TIMEOUT = float(os.getenv("HF_VTON_TIMEOUT", "110"))

CATVTON_SPACE = os.getenv("CATVTON_SPACE", "zhengchong/CatVTON").strip()
CATVTON_STEPS = int(os.getenv("CATVTON_STEPS", "50"))
CATVTON_GUIDANCE = float(os.getenv("CATVTON_GUIDANCE", "2.5"))

# Self-hosted VTON on a separate NVIDIA box (no tokens, no billing, no public
# Space). The kiosk Mac has no CUDA GPU and only 16 GB unified memory, so the
# model runs on a separate machine and we talk to it over the LAN.
# CatVTON uses POST /generate; IDM-VTON local wrapper uses POST /tryon.
VTON_LOCAL_URL = os.getenv("VTON_LOCAL_URL", "http://127.0.0.1:8010").strip().rstrip("/")
VTON_LOCAL_TIMEOUT = float(os.getenv("VTON_LOCAL_TIMEOUT", "180"))
VTON_LOCAL_MODEL = os.getenv("VTON_LOCAL_MODEL", "catvton").strip().lower()
VTON_ALLOW_MOCK = os.getenv("VTON_ALLOW_MOCK", "").strip().lower() in ("1", "true", "yes")
