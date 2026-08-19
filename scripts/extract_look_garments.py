#!/usr/bin/env python3
"""Build isolated garment product shots from featured look photos.

IDM-VTON needs clothing on white — the complete silhouette of that item,
never a model/person photo and never a mismatched blouse PNG for a dress.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
LOOKS = ROOT / "frontend" / "public" / "looks"
OUT = ROOT / "frontend" / "public" / "garments"


def _rgb(path: Path) -> np.ndarray:
    return np.array(Image.open(path).convert("RGB"))


def _channels(rgb: np.ndarray):
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    return r, g, b, luma


def _skin(r, g, b) -> np.ndarray:
    return (r > 88) & (g > 42) & (b > 18) & (r > g + 8) & (r > b + 12)


def _flood_background(rgb: np.ndarray, thresh: int = 38) -> np.ndarray:
    """True where pixels are the studio backdrop, grown from the frame border."""
    h, w = rgb.shape[:2]
    r, g, b, _ = _channels(rgb)
    corners = np.array(
        [rgb[2, 2], rgb[2, w - 3], rgb[h - 3, 2], rgb[h - 3, w - 3]],
        dtype=np.int16,
    )
    bg = corners.mean(axis=0)
    dist = np.abs(r - bg[0]) + np.abs(g - bg[1]) + np.abs(b - bg[2])
    similar = dist < thresh
    seed = np.zeros((h, w), dtype=bool)
    seed[0, :] = similar[0, :]
    seed[-1, :] = similar[-1, :]
    seed[:, 0] = similar[:, 0]
    seed[:, -1] = similar[:, -1]
    return ndimage.binary_propagation(seed, mask=similar)


def _largest(mask: np.ndarray, close: int = 14) -> np.ndarray:
    mask = ndimage.binary_opening(mask, iterations=1)
    mask = ndimage.binary_closing(mask, iterations=close)
    mask = ndimage.binary_fill_holes(mask)
    lab, n = ndimage.label(mask)
    if not n:
        return mask
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    return lab == (int(np.argmax(sizes)) + 1)


def _inpaint(rgb: np.ndarray, hole: np.ndarray, cloth: np.ndarray) -> np.ndarray:
    """Fill interior holes (hands over the dress) with nearby cloth color."""
    if not hole.any() or not cloth.any():
        return rgb
    med = np.median(rgb[cloth], axis=0).astype(np.uint8)
    out = rgb.copy()
    out[hole] = med
    return out


def _export(rgb: np.ndarray, mask: np.ndarray, dest: Path, max_w: int = 720) -> None:
    out = np.full_like(rgb, 255)
    out[mask] = rgb[mask]
    ys, xs = np.where(mask)
    if not len(ys):
        raise SystemExit(f"no cloth pixels for {dest.name}")
    pad = 18
    y0, y1 = max(0, int(ys.min()) - pad), min(mask.shape[0], int(ys.max()) + pad)
    x0, x1 = max(0, int(xs.min()) - pad), min(mask.shape[1], int(xs.max()) + pad)
    crop = Image.fromarray(out[y0:y1, x0:x1])
    if crop.width > max_w:
        crop = crop.resize((max_w, int(max_w * crop.height / crop.width)), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    crop.save(dest)
    print(
        f"wrote {dest.name} {crop.size} cloth={float(mask.mean()):.3f} "
        f"aspect={crop.height / crop.width:.2f}"
    )


def extract_garment(
    src: Path,
    dest: Path,
    y0f: float,
    y1f: float,
    x0f: float = 0.12,
    x1f: float = 0.88,
    drop_head: float = 0.06,
    close: int = 16,
    bg_thresh: int = 42,
) -> None:
    rgb = _rgb(src)
    h, w = rgb.shape[:2]
    y0, y1 = int(h * y0f), int(h * y1f)
    x0, x1 = int(w * x0f), int(w * x1f)
    body = rgb[y0:y1, x0:x1]
    r, g, b, luma = _channels(body)
    bg = _flood_background(body, thresh=bg_thresh)
    person = ~bg
    skin = _skin(r, g, b)
    # Hair: dark pixels in the top of the crop that are not navy/colored cloth
    hair = (luma < 55) & (np.abs(r.astype(int) - b.astype(int)) < 18) & (np.abs(r.astype(int) - g.astype(int)) < 18)
    hair[: int(hair.shape[0] * drop_head)] |= (luma[: int(hair.shape[0] * drop_head)] < 80) & ~skin[
        : int(hair.shape[0] * drop_head)
    ]
    cloth = person & ~skin & ~hair
    cloth[: int(cloth.shape[0] * 0.03)] = False
    cloth = _largest(cloth, close=close)
    # Interior holes (hands) — fill with cloth color, then add to mask
    filled = ndimage.binary_fill_holes(cloth)
    holes = filled & ~cloth
    body = _inpaint(body, holes, cloth)
    cloth = filled
    _export(body, cloth, dest)


def main() -> None:
    extract_garment(
        LOOKS / "look-navy-dress.jpg",
        OUT / "garment-lk4-dress.png",
        y0f=0.155,
        y1f=0.90,
        drop_head=0.08,
        close=18,
    )
    extract_garment(
        LOOKS / "look-beige-dress.jpg",
        OUT / "garment-lk2-dress.png",
        y0f=0.16,
        y1f=0.78,
        drop_head=0.08,
        close=14,
        bg_thresh=22,
    )
    extract_garment(
        LOOKS / "look-olive-blouse.jpg",
        OUT / "garment-lk3-top.png",
        y0f=0.18,
        y1f=0.56,
        drop_head=0.04,
        close=12,
    )
    extract_garment(
        LOOKS / "look-navy-jumpsuit.jpg",
        OUT / "garment-lk5-jumpsuit.png",
        y0f=0.14,
        y1f=0.94,
        drop_head=0.08,
        close=16,
    )
    extract_garment(
        LOOKS / "look-blush-suit.jpg",
        OUT / "garment-lk1-suit.png",
        y0f=0.15,
        y1f=0.96,
        drop_head=0.07,
        close=16,
        bg_thresh=28,
    )


if __name__ == "__main__":
    main()
