"""
Landmark-based skin tone sampling.

The old approach averaged every pixel inside the face bounding box, which
mixes eyes, eyebrows, lips, hair and sometimes background into the "skin"
color. This module uses MediaPipe Face Mesh landmarks to sample only bare
skin (forehead, both cheeks, nose bridge, chin), rejects per-patch outliers
(stray hair, eyelashes, specular highlights, shadow edges) without assuming
any fixed skin-color range, and combines regions via median so a single bad
patch (e.g. one cheek in shadow from angled kiosk lighting) can't skew the
result.
"""

from __future__ import annotations

import threading
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
from PIL import Image

# Canonical MediaPipe Face Mesh indices (stable across refine_landmarks
# on/off) that sit on bare skin, clear of eyebrows, eyelids, lips and the
# hairline.
_REGIONS: Dict[str, Tuple[int, ...]] = {
    "forehead": (151, 108, 337, 9),
    "left_cheek": (50, 101),
    "right_cheek": (280, 330),
    "nose_bridge": (6,),
    "chin": (152, 175),
}

_mesh_singleton = None
# MediaPipe solution graphs are stateful and not thread-safe; FastAPI serves
# sync endpoints from a threadpool, so every `.process()` call is serialized.
_mesh_lock = threading.Lock()


def _get_mesh():
    global _mesh_singleton
    if _mesh_singleton is None:
        import mediapipe as mp

        _mesh_singleton = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        )
    return _mesh_singleton


def get_face_landmarks(image: Image.Image) -> Optional[List[Tuple[int, int]]]:
    """Pixel (x, y) coords for all face mesh landmarks, or None if unavailable."""
    try:
        with _mesh_lock:
            mesh = _get_mesh()
    except Exception:
        return None

    rgb = np.asarray(image.convert("RGB"))
    h, w = rgb.shape[:2]
    with _mesh_lock:
        result = mesh.process(rgb)
    if not result.multi_face_landmarks:
        return None

    face = result.multi_face_landmarks[0]
    return [(int(lm.x * w), int(lm.y * h)) for lm in face.landmark]


def _patch_pixels(rgb: np.ndarray, cx: int, cy: int, radius: int) -> np.ndarray:
    h, w = rgb.shape[:2]
    x0, x1 = max(0, cx - radius), min(w, cx + radius + 1)
    y0, y1 = max(0, cy - radius), min(h, cy + radius + 1)
    if x1 <= x0 or y1 <= y0:
        return np.empty((0, 3))
    return rgb[y0:y1, x0:x1].reshape(-1, 3).astype(np.float64)


def _filter_unusable(pixels: np.ndarray) -> np.ndarray:
    """Drop shadows, specular highlights, near-grey, and clipped pixels.

    Luma 40–245, skip near-white, skip low-chroma (hair/shadow/background).
    """
    if len(pixels) == 0:
        return pixels
    luma = pixels @ np.array([0.2126, 0.7152, 0.0722])
    rng = pixels.max(axis=1) - pixels.min(axis=1)
    keep = (luma >= 40.0) & (luma <= 245.0) & (rng >= 8.0)
    keep &= ~((pixels[:, 0] > 240) & (pixels[:, 1] > 240) & (pixels[:, 2] > 240))
    keep &= ~((pixels[:, 0] < 25) & (pixels[:, 1] < 25) & (pixels[:, 2] < 25))
    filtered = pixels[keep]
    return filtered if len(filtered) >= max(8, len(pixels) * 0.12) else pixels


def _reject_outliers(pixels: np.ndarray, k: float = 2.5) -> np.ndarray:
    """Drop pixels far from the patch's dominant color cluster (MAD-based).

    Statistical, not a fixed skin-color range, so it doesn't bias toward
    lighter or darker skin tones — it just trims whatever doesn't match
    the majority of the patch (eyelash, hair strand, glare, shadow edge).
    """
    if len(pixels) < 5:
        return pixels
    median = np.median(pixels, axis=0)
    dist = np.linalg.norm(pixels - median, axis=1)
    mad = np.median(dist) or 1.0
    keep = dist <= k * mad * 1.4826
    filtered = pixels[keep]
    return filtered if len(filtered) >= max(3, len(pixels) * 0.15) else pixels


def sample_skin_tone(
    image: Image.Image, landmarks: Sequence[Tuple[int, int]]
) -> Optional[Tuple[Tuple[float, float, float], Dict[str, Tuple[float, float, float]]]]:
    """Median skin RGB pooled from multiple true-skin regions.

    Returns ((r, g, b), per_region_medians) or None if no region yielded a
    usable patch.
    """
    rgb = np.asarray(image.convert("RGB"))
    h, w = rgb.shape[:2]
    radius = max(3, min(w, h) // 60)

    region_medians: Dict[str, Tuple[float, float, float]] = {}
    for name, indices in _REGIONS.items():
        pooled = []
        for idx in indices:
            if idx >= len(landmarks):
                continue
            cx, cy = landmarks[idx]
            pooled.append(_patch_pixels(rgb, cx, cy, radius))
        if not pooled:
            continue
        patch = np.concatenate(pooled, axis=0)
        if len(patch) == 0:
            continue
        patch = _filter_unusable(patch)
        patch = _reject_outliers(patch)
        if len(patch) == 0:
            continue
        region_medians[name] = tuple(np.median(patch, axis=0).tolist())

    if not region_medians:
        return None

    values = np.array(list(region_medians.values()))
    overall = tuple(np.median(values, axis=0).tolist())
    return overall, region_medians
