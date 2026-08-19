#!/usr/bin/env python3
"""Local test: garment prep + T'nalak + color must keep cloth and pattern."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ai-service"))

from app.services.tryon import apply_textile, prepare_garment, recolor_garment, tint_pattern  # noqa: E402


def main() -> int:
    blouse = Image.open(ROOT / "frontend/public/garments/garment-collar-blouse-base.png")
    textile = Image.open(ROOT / "frontend/public/textiles/textile-tnalak.jpg")
    prepared, cloth_mask = prepare_garment(blouse)
    patterned = apply_textile(prepared, textile, cloth_mask)
    colored = tint_pattern(patterned, "#1E4D8C", strength=0.4, mask=cloth_mask)

    mask = np.array(cloth_mask.convert("L")) > 16
    cloth = float(mask.mean())
    pat = np.array(patterned.convert("RGB"))
    cloth_pat = pat[mask]
    contrast = float(cloth_pat.std()) if len(cloth_pat) else 0.0

    out = Path("/tmp/ptri-prep-tnalak-blue.png")
    colored.save(out)
    print(f"cloth_fraction={cloth:.3f}")
    print(f"pattern_contrast={contrast:.1f}")
    print(f"prepared_size={prepared.size}")
    print(f"saved={out}")
    if cloth < 0.08:
        print("FAIL: preparation removed the garment")
        return 1
    holes = float(((cloth_pat[:, 0] > 248) & (cloth_pat[:, 1] > 248) & (cloth_pat[:, 2] > 248)).mean()) if len(cloth_pat) else 1
    print(f"white_holes_in_cloth={holes:.3f}")
    if contrast < 12:
        print("FAIL: T'nalak pattern was crushed")
        return 2
    if holes > 0.12:
        print("FAIL: cloth mask still has large white holes")
        return 3
    print("PASS: isolated blouse kept, T'nalak visible, color tint applied")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
