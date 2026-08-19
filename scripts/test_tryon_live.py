#!/usr/bin/env python3
"""Direct IDM-VTON /tryon test — no frontend.

Proves whether Hugging Face returned an actual generated image.
Never prints HF_TOKEN.
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

from app.core.config import HF_TOKEN, HF_VTON_SPACE, TRYON_STEPS  # noqa: E402
from app.services.tryon import VTON_PROVIDER, _torso_mae, virtual_tryon  # noqa: E402


def data_url(path: Path) -> str:
    raw = path.read_bytes()
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"


def main() -> int:
    person_path = ROOT / "frontend/public/models/template-female-studio.png"
    garment_path = ROOT / "frontend/public/garments/garment-lk4-dress.png"
    textile_path = ROOT / "frontend/public/textiles/textile-abaca.jpg"
    out_path = Path("/tmp/ptri-tryon-live.png")

    print("provider", VTON_PROVIDER)
    print("space", HF_VTON_SPACE)
    print("authenticated", bool(HF_TOKEN))
    print("steps", TRYON_STEPS)
    print("person", person_path.name, Image.open(person_path).size)
    print("garment", garment_path.name, Image.open(garment_path).size)
    print("textile", textile_path.name)

    started = time.time()
    result = virtual_tryon(
        data_url(person_path),
        data_url(garment_path),
        {
            "category": "dresses",
            "garment_description": "beige short-sleeve shirt dress with a matching waist belt, knee length",
            "fabric_hex": "#C4A574",
            "textile_name": "Abaca",
            "textile_image": data_url(textile_path),
        },
    )
    elapsed = round(time.time() - started, 1)
    print("elapsed_s", elapsed)
    print("ok", result.ok)
    print("status", result.status)
    print("message", result.message)
    print("diagnostics_keys", sorted((result.diagnostics or {}).keys()))
    diag = result.diagnostics or {}
    for key in ("space", "steps", "torso_mae", "clothing_changed", "output_size", "elapsed_s", "attempts"):
        if key in diag:
            print(key, diag[key])

    if not result.ok or not result.image_data_url:
        print("RESULT=FAIL no generated image")
        return 1

    raw = result.image_data_url.split(",", 1)[1]
    generated = Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")
    generated.save(out_path)
    person = Image.open(person_path).convert("RGB")
    mae = _torso_mae(person, generated)
    same_as_person = generated.resize(person.size) == person
    print("output_path", out_path)
    print("output_size", generated.size)
    print("torso_mae", round(mae, 2))
    print("same_as_person", same_as_person)
    if same_as_person or mae < 4:
        print("RESULT=FAIL output matches original person")
        return 2
    print("RESULT=OK generated image saved")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
