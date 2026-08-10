from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SHARED_CATALOG = ROOT / "shared" / "catalog"
PALETTE_PATH = SHARED_CATALOG / "palette.json"

AI_HOST = os.getenv("AI_HOST", "127.0.0.1")
AI_PORT = int(os.getenv("AI_PORT", "8001"))
MODEL_NAME = "ptri-mvp-color-ranker"
MODEL_VERSION = "0.1.0"
