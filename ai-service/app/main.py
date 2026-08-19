from __future__ import annotations

import os
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router

app = FastAPI(
    title="PTRI AI Color Analysis Service",
    version="0.1.0",
    description="AI/CV service for PTRI kiosk. Loads palette from shared/catalog.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
def _warmup_tryon_client() -> None:
    """Connect to IDM-VTON once at boot so the first visitor is not waiting on Gradio handshake."""
    if os.getenv("VTON_PROVIDER", "none").strip().lower() not in (
        "huggingface",
        "hf",
        "huggingface_idm_vton",
        "huggingface_catvton",
        "catvton_hf",
    ):
        return

    def _run() -> None:
        try:
            from .services.tryon import HF_VTON_SPACES, _hf_client

            if HF_VTON_SPACES:
                _hf_client(HF_VTON_SPACES[0])
        except Exception:
            pass

    threading.Thread(target=_run, daemon=True).start()
