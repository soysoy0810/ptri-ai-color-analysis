from __future__ import annotations

import json
from functools import lru_cache
from typing import List

from .config import PALETTE_PATH


@lru_cache(maxsize=1)
def load_palette() -> List[dict]:
    with PALETTE_PATH.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        raise RuntimeError(f"Invalid palette file: {PALETTE_PATH}")
    return data


def hex_to_rgb(hex_color: str):
    h = hex_color.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))
