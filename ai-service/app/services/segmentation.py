"""
Person segmentation for background compositing.

Default: MediaPipe Selfie Segmentation (general/landscape model, CPU-only,
no GPU required — consistent with the rest of this service).

Unlike face detection, there's no honest heuristic fallback for
segmentation (a "center crop is probably the person" guess would produce
visibly wrong composites, not a degraded-but-real result), so if the model
isn't available this returns None and the caller surfaces that instead of
faking a mask.
"""

from __future__ import annotations

import threading
from typing import Optional, Protocol

import numpy as np
from PIL import Image


class PersonSegmenter(Protocol):
    def segment(self, image: Image.Image) -> Optional[np.ndarray]:
        """Returns a float32 mask (H, W) in [0, 1], 1 = person, or None."""
        ...


class MediaPipeSelfieSegmenter:
    """Pretrained MediaPipe Selfie Segmentation."""

    def __init__(self) -> None:
        import mediapipe as mp

        # model_selection=1: general model, better suited to the half/full
        # body kiosk framing than the tighter "landscape" default (0).
        self._segmenter = mp.solutions.selfie_segmentation.SelfieSegmentation(
            model_selection=1
        )
        # MediaPipe's Python solutions wrap a stateful graph that is NOT
        # thread-safe. FastAPI runs sync endpoints in a threadpool, so
        # without this lock concurrent requests corrupt the graph and it
        # starts raising "received an empty Packet" for every later call.
        self._lock = threading.Lock()

    def segment(self, image: Image.Image) -> Optional[np.ndarray]:
        rgb = np.array(image.convert("RGB"))
        with self._lock:
            result = self._segmenter.process(rgb)
        if result.segmentation_mask is None:
            return None
        return result.segmentation_mask.astype("float32")


_segmenter_singleton: Optional[PersonSegmenter] = None


def get_segmenter() -> Optional[PersonSegmenter]:
    global _segmenter_singleton
    if _segmenter_singleton is None:
        try:
            _segmenter_singleton = MediaPipeSelfieSegmenter()
        except Exception:
            _segmenter_singleton = None
    return _segmenter_singleton


def refine_person_mask(mask: np.ndarray, rgb: np.ndarray) -> np.ndarray:
    """Keep hair with the person. Soften edges instead of cutting strands."""
    from PIL import ImageFilter

    h, w = mask.shape
    soft_img = Image.fromarray((np.clip(mask, 0.0, 1.0) * 255).astype("uint8"), mode="L")
    soft = np.array(soft_img.filter(ImageFilter.GaussianBlur(radius=1.6)), dtype="float32") / 255.0
    luma = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    grown = np.array(soft_img.filter(ImageFilter.MaxFilter(9)), dtype="float32") / 255.0
    near_person = grown > 0.2
    hair = (luma < 95) & near_person
    top_h = max(8, int(h * 0.42))
    hair[:top_h] |= (luma[:top_h] < 110) & (soft[:top_h] > 0.08)
    combined = np.maximum(soft, hair.astype("float32") * 0.9)
    combined_img = Image.fromarray((np.clip(combined, 0.0, 1.0) * 255).astype("uint8"), mode="L")
    combined = np.array(combined_img.filter(ImageFilter.GaussianBlur(radius=0.8)), dtype="float32") / 255.0
    return np.clip(combined, 0.0, 1.0)


def mask_to_png_data_url(mask: np.ndarray) -> str:
    """Encodes the real soft probability mask (already naturally
    anti-aliased at the edges by the model) as a base64 grayscale PNG."""
    import base64
    import io

    alpha_u8 = (np.clip(mask, 0.0, 1.0) * 255).astype("uint8")
    img = Image.fromarray(alpha_u8, mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"
