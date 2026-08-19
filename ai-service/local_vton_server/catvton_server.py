"""
CatVTON GPU inference server.

Run this on a Linux + NVIDIA machine (or Google Colab with a T4/A100), NOT
on the Apple Silicon kiosk Mac.

    POST /generate  person + isolated garment + optional person clothing mask
    GET  /health

The kiosk FastAPI already:
  - prepares the isolated garment (textile + color on the garment mask)
  - builds a person clothing-replace mask
  - POSTs here

This process only runs CatVTON diffusion. It never returns the original
person photo as a fake success.

Weights are downloaded from Hugging Face once. That is not the same as
calling the ZeroGPU Space for every generation.
"""

from __future__ import annotations

import base64
import io
import os
import sys
from typing import Optional

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from PIL import Image
from pydantic import BaseModel

app = FastAPI(title="PTRI CatVTON GPU server")

_PIPELINE = None
_LOAD_ERROR = None


class GenerateRequest(BaseModel):
    person_image: str
    garment_image: str
    garment_mask: Optional[str] = None
    category: str = "upper_body"
    cloth_type: Optional[str] = None
    textile: Optional[str] = None
    color: Optional[str] = None
    steps: int = 50
    guidance: float = 2.5
    seed: int = 42


def _decode(data_url: str) -> Image.Image:
    raw = data_url.split(",", 1)[1] if "," in data_url else data_url
    return Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")


def _encode(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def _cloth_type(category: str, explicit: Optional[str]) -> str:
    if explicit in ("upper", "lower", "overall"):
        return explicit
    if category == "lower_body":
        return "lower"
    if category == "dresses":
        return "overall"
    return "upper"


def _load_pipeline():
    global _PIPELINE, _LOAD_ERROR
    if _PIPELINE is not None or _LOAD_ERROR:
        return _PIPELINE
    try:
        import torch
        from huggingface_hub import snapshot_download

        if not torch.cuda.is_available():
            _LOAD_ERROR = (
                "CUDA is not available on this host. CatVTON needs an NVIDIA GPU. "
                "Do not run this server on the Apple Silicon kiosk Mac."
            )
            return None

        # Local clone of Zheng-Chong/CatVTON must be on PYTHONPATH.
        from model.pipeline import CatVTONPipeline  # type: ignore
        from utils import init_weight_dtype  # type: ignore

        attn_ckpt = snapshot_download(repo_id="zhengchong/CatVTON")
        dtype = init_weight_dtype(os.getenv("CATVTON_PRECISION", "bf16"))
        base_ckpt = os.getenv(
            "CATVTON_BASE_CKPT",
            "booksforcharlie/stable-diffusion-inpainting",
        )
        _PIPELINE = CatVTONPipeline(
            base_ckpt=base_ckpt,
            attn_ckpt=attn_ckpt,
            attn_ckpt_version="mix",
            weight_dtype=dtype,
            use_tf32=True,
            device="cuda",
        )
        return _PIPELINE
    except Exception as exc:  # noqa: BLE001
        _LOAD_ERROR = f"CatVTON failed to load: {exc}"
        return None


@app.get("/health")
def health():
    info = {"ok": True, "model": "CatVTON", "ready": False}
    try:
        import torch

        info["device"] = "cuda" if torch.cuda.is_available() else "cpu"
        if torch.cuda.is_available():
            info["gpu"] = torch.cuda.get_device_name(0)
            info["vram_gb"] = round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 1)
    except ImportError:
        info["device"] = "unknown"

    pipe = _load_pipeline()
    info["ready"] = pipe is not None
    if _LOAD_ERROR:
        info["ok"] = False
        info["reason"] = _LOAD_ERROR
    return info


@app.post("/generate")
def generate(req: GenerateRequest):
    pipe = _load_pipeline()
    if pipe is None:
        return JSONResponse(
            {
                "ok": False,
                "status": "model_not_ready",
                "message": _LOAD_ERROR or "CatVTON is not loaded.",
            },
            status_code=503,
        )

    try:
        person = _decode(req.person_image)
        garment = _decode(req.garment_image)
        mask = _decode(req.garment_mask).convert("L") if req.garment_mask else None
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(
            {"ok": False, "status": "bad_input", "message": f"Could not read images: {exc}"},
            status_code=400,
        )

    if mask is None:
        return JSONResponse(
            {
                "ok": False,
                "status": "bad_input",
                "message": (
                    "A person clothing mask is required. The kiosk FastAPI should send "
                    "garment_mask so this GPU server does not need DensePose."
                ),
            },
            status_code=400,
        )

    width, height = 768, 1024
    person = person.resize((width, height), Image.LANCZOS)
    garment = garment.resize((width, height), Image.LANCZOS)
    mask = mask.resize((width, height), Image.NEAREST)

    try:
        import torch

        generator = torch.Generator(device="cuda").manual_seed(int(req.seed))
        result = pipe(
            image=person,
            condition_image=garment,
            mask=mask,
            num_inference_steps=max(10, min(100, int(req.steps))),
            guidance_scale=float(req.guidance),
            generator=generator,
        )[0]
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(
            {"ok": False, "status": "generation_failed", "message": f"CatVTON inference failed: {exc}"},
            status_code=500,
        )

    if result is None:
        return JSONResponse(
            {"ok": False, "status": "generation_failed", "message": "CatVTON returned no image."},
            status_code=500,
        )

    out = result.convert("RGB")
    return {
        "ok": True,
        "image": _encode(out),
        "output_size": list(out.size),
        "model": "CatVTON",
        "cloth_type": _cloth_type(req.category, req.cloth_type),
    }


if __name__ == "__main__":
    import uvicorn

    if _load_pipeline() is None:
        print(_LOAD_ERROR or "CatVTON did not load", file=sys.stderr)
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("VTON_PORT", "8010")))
