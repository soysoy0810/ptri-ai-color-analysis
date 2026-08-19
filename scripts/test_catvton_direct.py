#!/usr/bin/env python3
"""Direct CatVTON GPU-server test. Never claims success without a saved image.

Uses the same garment pipeline as the kiosk: isolated dress + T'nalak + color.
Does not print tokens. Fails honestly if VTON_LOCAL_URL is down.
"""

from __future__ import annotations

import base64
import io
import sys
import time
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ai-service"))

from app.core.config import VTON_LOCAL_URL  # noqa: E402
from app.services.tryon import (  # noqa: E402
    VTON_PROVIDER,
    _torso_mae,
    _vton_local_reachable,
    virtual_tryon,
)


def data_url(path: Path) -> str:
    raw = path.read_bytes()
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"


def main() -> int:
    print("configured_provider", VTON_PROVIDER)
    print("local_reachable", _vton_local_reachable())
    if not _vton_local_reachable():
        print("RESULT=FAIL no CatVTON GPU server")
        print("Start ai-service/local_vton_server/catvton_server.py on NVIDIA/Colab,")
        print("then: python scripts/set_vton_local_url.py <url>")
        return 1

    person_path = ROOT / "frontend/public/models/template-female-studio.png"
    garment_path = ROOT / "frontend/public/garments/garment-lk4-dress.png"
    textile_path = ROOT / "frontend/public/textiles/textile-tnalak.jpg"
    out_path = Path("/tmp/ptri-catvton-direct.png")

    started = time.time()
    result = virtual_tryon(
        data_url(person_path),
        data_url(garment_path),
        {
            "category": "dresses",
            "garment_description": "beige short-sleeve shirt dress",
            "fabric_hex": "#C4A574",
            "textile_name": "T'nalak",
            "textile_image": data_url(textile_path),
        },
    )
    print("elapsed_s", round(time.time() - started, 1))
    print("ok", result.ok)
    print("status", result.status)
    print("provider", result.provider)
    print("message", (result.message or "")[:300])
    if not result.ok or not result.image_data_url:
        print("RESULT=FAIL no generated image")
        return 1

    raw = result.image_data_url.split(",", 1)[1]
    generated = Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")
    generated.save(out_path)
    person = Image.open(person_path).convert("RGB")
    mae = _torso_mae(person, generated)
    print("output_path", out_path)
    print("output_size", generated.size)
    print("torso_mae", round(mae, 2))
    if mae < 4.0:
        print("RESULT=FAIL output matches the person photo too closely")
        return 1
    print("RESULT=GENERATED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
