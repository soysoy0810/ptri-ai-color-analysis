from __future__ import annotations

import base64
import io
import math
from typing import Dict, List, Tuple

from PIL import Image, ImageStat

from ..core.config import MODEL_NAME, MODEL_VERSION
from ..core.palette import hex_to_rgb, load_palette
from .face_detector import crop_face, get_face_detector


def decode_image(data_url: str) -> Image.Image:
    raw = data_url.split(",", 1)[1] if "," in data_url else data_url
    binary = base64.b64decode(raw)
    return Image.open(io.BytesIO(binary)).convert("RGB")


def average_rgb(img: Image.Image) -> Tuple[float, float, float]:
    sample = img.resize((64, 64))
    stats = ImageStat.Stat(sample)
    return stats.mean[0], stats.mean[1], stats.mean[2]


def rgb_to_lab(r: float, g: float, b: float) -> Tuple[float, float, float]:
    def pivot(c: float) -> float:
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r_l, g_l, b_l = pivot(r), pivot(g), pivot(b)
    x = (r_l * 0.4124 + g_l * 0.3576 + b_l * 0.1805) / 0.95047
    y = (r_l * 0.2126 + g_l * 0.7152 + b_l * 0.0722) / 1.00000
    z = (r_l * 0.0193 + g_l * 0.1192 + b_l * 0.9505) / 1.08883

    def f(t: float) -> float:
        return t ** (1 / 3) if t > 0.008856 else (7.787 * t) + (16 / 116)

    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy) - 16, 500 * (fx - fy), 200 * (fy - fz)


def delta_e(lab1: Tuple[float, float, float], lab2: Tuple[float, float, float]) -> float:
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(lab1, lab2)))


def lighting_quality(img: Image.Image) -> Dict[str, float | str]:
    gray = img.convert("L")
    stats = ImageStat.Stat(gray)
    mean = stats.mean[0]
    stddev = stats.stddev[0]
    status = "good"
    if mean < 55:
        status = "too_dark"
    elif mean > 210:
        status = "too_bright"
    elif stddev < 18:
        status = "flat_lighting"
    return {"mean_luma": round(mean, 1), "contrast": round(stddev, 1), "status": status}


def rank_palette(sample_rgb: Tuple[float, float, float]) -> List[dict]:
    sample_lab = rgb_to_lab(*sample_rgb)
    ranked = []
    for color in load_palette():
        rgb = hex_to_rgb(color["hex"])
        dist = delta_e(sample_lab, rgb_to_lab(*rgb))
        warmth = ((sample_rgb[0] - sample_rgb[2]) - (rgb[0] - rgb[2])) / 255.0
        score = max(0.0, 100.0 - dist * 1.35 - abs(warmth) * 8.0)
        ranked.append(
            {
                "id": color["id"],
                "name": color["name"],
                "hex": color["hex"],
                "score": round(score, 1),
                "delta_e": round(dist, 2),
            }
        )
    ranked.sort(key=lambda c: c["score"], reverse=True)
    return ranked


def analyze_image(data_url: str, session_id: str | None = None) -> dict:
    img = decode_image(data_url)
    quality = lighting_quality(img)

    detector = get_face_detector()
    region = detector.detect(img)
    face_detected = region is not None
    if region is None:
        # Still return a usable palette using center crop so the kiosk flow continues.
        from .face_detector import CenterCropFaceDetector

        region = CenterCropFaceDetector().detect(img)

    face = crop_face(img, region)
    sample = average_rgb(face)

    return {
        "session_id": session_id,
        "face_detected": face_detected,
        "face_region": {
            "left": region.left,
            "top": region.top,
            "right": region.right,
            "bottom": region.bottom,
            "confidence": region.confidence,
            "provider": region.provider,
        },
        "lighting": quality,
        "sample_rgb": {
            "r": round(sample[0], 1),
            "g": round(sample[1], 1),
            "b": round(sample[2], 1),
        },
        "top20": rank_palette(sample),
        "model": {
            "name": MODEL_NAME,
            "version": MODEL_VERSION,
            "face_provider": region.provider,
            "notes": "Pretrained MediaPipe when available; swappable via face_detector.get_face_detector().",
        },
    }
