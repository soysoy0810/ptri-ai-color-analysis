"""
HTTP wrapper around the upstream IDM-VTON pipeline, for our own GPU box.

Run this from inside a clone of https://huggingface.co/spaces/yisol/IDM-VTON
(see README.md) — it imports that repo's `app.py`, which already wires up
DensePose, human parsing and OpenPose. We deliberately do not re-implement the
pipeline; we only expose the entry point it already has over HTTP, in the shape
the kiosk's `local_server` provider expects.

    python server.py            # 0.0.0.0:8010

No API tokens. No billing. No public Space.
"""

from __future__ import annotations

import base64
import io
import sys

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from PIL import Image
from pydantic import BaseModel

try:
    # Provided by the upstream Space repo this file is dropped into.
    from app import start_tryon  # type: ignore
except ImportError:  # pragma: no cover - depends on deployment layout
    sys.exit(
        "Could not import start_tryon from app.py.\n"
        "Run this file from inside a clone of the yisol/IDM-VTON Space "
        "(see local_vton_server/README.md)."
    )

app = FastAPI(title="PTRI local IDM-VTON")


class TryOnRequest(BaseModel):
    person_image: str
    garment_image: str
    garment_description: str = "garment"
    category: str = "upper_body"
    steps: int = 40
    seed: int = 42


def _decode(data_url: str) -> Image.Image:
    raw = data_url.split(",", 1)[1] if "," in data_url else data_url
    return Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")


def _encode(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


@app.get("/health")
def health():
    info = {"ok": True}
    try:
        import torch

        info["device"] = "cuda" if torch.cuda.is_available() else "cpu"
        if torch.cuda.is_available():
            info["gpu"] = torch.cuda.get_device_name(0)
    except ImportError:
        info["device"] = "unknown"
    return info


@app.post("/tryon")
def tryon(req: TryOnRequest):
    try:
        person = _decode(req.person_image)
        garment = _decode(req.garment_image)
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(
            {"ok": False, "message": f"Could not read the supplied images: {exc}"},
            status_code=400,
        )

    # The kiosk already crops to IDM-VTON's 3:4 frame, so auto-crop stays off;
    # auto-masking stays on because we send no hand-drawn mask.
    editor_state = {"background": person, "layers": [], "composite": None}

    try:
        output, _masked = start_tryon(
            editor_state,
            garment,
            req.garment_description,
            True,          # is_checked      -> auto-generate mask
            False,         # is_checked_crop -> kiosk already framed it
            req.steps,
            req.seed,
        )
    except Exception as exc:  # noqa: BLE001
        # Surfaced verbatim on the kiosk, so keep it short and non-technical.
        return JSONResponse(
            {"ok": False, "message": f"Try-on generation failed: {exc}"},
            status_code=500,
        )

    return {"ok": True, "image": _encode(output)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8010)
