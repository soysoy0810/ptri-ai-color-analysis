"""
Swappable face/landmark providers.

Default: MediaPipe Face Mesh when installed.
Fallback: center-region heuristic (no training required).

Replace `get_face_detector()` return value to swap models later.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Protocol, Tuple

from PIL import Image


@dataclass
class FaceRegion:
    left: int
    top: int
    right: int
    bottom: int
    confidence: float
    provider: str


class FaceDetector(Protocol):
    def detect(self, image: Image.Image) -> Optional[FaceRegion]:
        ...


class CenterCropFaceDetector:
    """MVP fallback — no model weights required."""

    def detect(self, image: Image.Image) -> Optional[FaceRegion]:
        w, h = image.size
        return FaceRegion(
            left=int(w * 0.30),
            top=int(h * 0.18),
            right=int(w * 0.70),
            bottom=int(h * 0.62),
            confidence=0.55,
            provider="center_crop_fallback",
        )


class MediaPipeFaceDetector:
    """Pretrained MediaPipe Face Mesh / Face Detection."""

    def __init__(self) -> None:
        import mediapipe as mp

        self._mp = mp
        # FaceDetection is lighter for kiosk framing checks.
        self._detector = mp.solutions.face_detection.FaceDetection(
            model_selection=1,
            min_detection_confidence=0.5,
        )

    def detect(self, image: Image.Image) -> Optional[FaceRegion]:
        import numpy as np

        rgb = np.array(image.convert("RGB"))
        result = self._detector.process(rgb)
        if not result.detections:
            return None

        det = result.detections[0]
        box = det.location_data.relative_bounding_box
        w, h = image.size
        left = max(0, int(box.xmin * w))
        top = max(0, int(box.ymin * h))
        right = min(w, int((box.xmin + box.width) * w))
        bottom = min(h, int((box.ymin + box.height) * h))
        score = float(det.score[0]) if det.score else 0.0
        return FaceRegion(left, top, right, bottom, score, "mediapipe_face_detection")


def get_face_detector() -> FaceDetector:
    try:
        return MediaPipeFaceDetector()
    except Exception:
        return CenterCropFaceDetector()


def crop_face(image: Image.Image, region: FaceRegion) -> Image.Image:
    return image.crop((region.left, region.top, region.right, region.bottom))
