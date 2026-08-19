#!/usr/bin/env python3
"""Verify IDM-VTON actually changes the clothing on a person photo."""

from __future__ import annotations

import base64
import io
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ai-service"))

from app.services.tryon import _torso_mae, virtual_tryon  # noqa: E402


def data_url(path: Path) -> str:
    raw = path.read_bytes()
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"


def main() -> int:
    person_path = ROOT / "frontend/public/models/template-female-studio.png"
    garment_path = ROOT / "frontend/public/garments/garment-collar-blouse-base.png"
    textile_path = ROOT / "frontend/public/textiles/textile-tnalak.jpg"
    out_path = Path("/tmp/ptri-vton-olive-test.png")

    result = virtual_tryon(
        data_url(person_path),
        data_url(garment_path),
        {
            "category": "upper_body",
            "garment_description": "fitted collared blouse, button front, woven in T'nalak Philippine textile",
            "fabric_hex": "#5B3A29",
            "textile_name": "T'nalak",
            "textile_image": data_url(textile_path),
        },
    )
    print("ok", result.ok)
    print("status", result.status)
    print("message", result.message)
    print("provider", result.provider)
    print("diagnostics", result.diagnostics)
    if not result.ok or not result.image_data_url:
        return 1

    raw = result.image_data_url.split(",", 1)[1]
    generated = Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")
    generated.save(out_path)
    person = Image.open(person_path).convert("RGB")
    mae = _torso_mae(person, generated)
    print("torso_mae", round(mae, 2))
    print("saved", out_path, generated.size)
    return 0 if mae >= 14 else 2


if __name__ == "__main__":
    raise SystemExit(main())
