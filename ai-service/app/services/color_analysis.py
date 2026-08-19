from __future__ import annotations

import base64
import io
import logging
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image, ImageStat

from ..core.config import MODEL_NAME, MODEL_VERSION
from .color_science import classify_skin_lab, lab_to_rgb, rank_palette, rgb_to_lab
from .face_detector import crop_face, get_face_detector
from .skin_sampler import get_face_landmarks, sample_skin_tone

log = logging.getLogger("ptri.skin")

Rgb = Tuple[float, float, float]
Lab = Tuple[float, float, float]


def decode_image(data_url: str) -> Image.Image:
    raw = data_url.split(",", 1)[1] if "," in data_url else data_url
    binary = base64.b64decode(raw)
    return Image.open(io.BytesIO(binary)).convert("RGB")


def average_rgb(img: Image.Image) -> Rgb:
    sample = img.resize((64, 64))
    stats = ImageStat.Stat(sample)
    return stats.mean[0], stats.mean[1], stats.mean[2]


def lighting_quality(img: Image.Image, region=None) -> Dict[str, float | str]:
    """Judge exposure on the face, not the whole frame.

    A dark studio backdrop used to inflate contrast and get labelled as
    harsh lighting even when the face itself was evenly lit.
    """
    sample = img
    if region is not None:
        box = (
            max(0, region.left),
            max(0, region.top),
            min(img.size[0], region.right),
            min(img.size[1], region.bottom),
        )
        if box[2] > box[0] and box[3] > box[1]:
            bw, bh = box[2] - box[0], box[3] - box[1]
            inset_x, inset_y = int(bw * 0.22), int(bh * 0.18)
            sample = img.crop(
                (
                    box[0] + inset_x,
                    box[1] + inset_y,
                    box[2] - inset_x,
                    box[3] - inset_y,
                )
            )
    else:
        w, h = img.size
        sample = img.crop((int(w * 0.25), int(h * 0.18), int(w * 0.75), int(h * 0.72)))

    gray = sample.convert("L")
    stats = ImageStat.Stat(gray)
    mean = stats.mean[0]
    stddev = stats.stddev[0]
    status = "good"
    if mean < 80:
        status = "too_dark"
    elif mean > 215:
        status = "too_bright"
    elif stddev > 55:
        status = "harsh_shadows"
    return {"mean_luma": round(mean, 1), "contrast": round(stddev, 1), "status": status}


def _robust_lab(labs: List[Lab]) -> Lab:
    """Median Lab; drop extreme L* frames when enough samples exist."""
    arr = np.asarray(labs, dtype=np.float64)
    if len(arr) >= 5:
        order = np.argsort(arr[:, 0])
        arr = arr[order[1:-1]]
    med = np.median(arr, axis=0)
    return float(med[0]), float(med[1]), float(med[2])


def _sample_frame(img: Image.Image) -> dict:
    """Landmark skin sample for one frame. No scene-wide white balance.

    Gray-world on the whole photo was flipping undertone under warm/cool
    kiosk lights. Lighting is reported, not "corrected" into the pixels.
    """
    detector = get_face_detector()
    region = detector.detect(img)
    face_detected = region is not None
    if region is None:
        from .face_detector import CenterCropFaceDetector

        region = CenterCropFaceDetector().detect(img)

    quality = lighting_quality(img, region)

    landmarks = get_face_landmarks(img)
    skin_result = sample_skin_tone(img, landmarks) if landmarks else None
    if skin_result is not None:
        sample, region_samples = skin_result
        sample_source = "face_mesh_skin_patches"
        lumas = [
            0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
            for rgb in region_samples.values()
        ]
        if lumas:
            patch_std = float(np.std(lumas)) if len(lumas) > 1 else 0.0
            patch_mean = float(np.mean(lumas))
            status = str(quality["status"])
            if float(quality["mean_luma"]) < 80 or patch_mean < 75:
                status = "too_dark"
            elif patch_std > 32:
                status = "harsh_shadows"
            elif status == "harsh_shadows" and patch_std <= 32:
                # Face-box contrast was hair/background; skin regions agree.
                status = "good"
            quality = {
                "mean_luma": round(float(quality["mean_luma"]), 1),
                "contrast": round(patch_std, 1),
                "status": status,
            }
    else:
        face = crop_face(img, region)
        fw, fh = face.size
        inset = face.crop(
            (int(fw * 0.30), int(fh * 0.35), int(fw * 0.70), int(fh * 0.75))
        )
        sample = average_rgb(inset if inset.size[0] and inset.size[1] else face)
        region_samples = {}
        sample_source = "bbox_center_fallback"

    lab = rgb_to_lab(*sample)
    region_labs = {name: rgb_to_lab(*rgb) for name, rgb in region_samples.items()}
    return {
        "sample": sample,
        "lab": lab,
        "region_samples": region_samples,
        "region_labs": region_labs,
        "quality": quality,
        "face_detected": face_detected,
        "region": region,
        "sample_source": sample_source,
    }


def analyze_image(
    data_url: str,
    session_id: str | None = None,
    extra_images: List[str] | None = None,
) -> dict:
    """Multi-frame camera-based skin analysis.

    Primary image is the identity capture. extra_images are additional
    hold-still frames. Classification uses the robust median of Lab
    across frames that produced a usable skin sample.
    """
    urls: List[str] = [data_url]
    if extra_images:
        urls.extend(item for item in extra_images if item)
    urls = urls[:8]

    frames: List[dict] = []
    for url in urls:
        try:
            img = decode_image(url)
        except Exception:
            continue
        try:
            frames.append(_sample_frame(img))
        except Exception:
            log.exception("skin frame sample failed")

    if not frames:
        raise ValueError("No analyzable frames were received.")

    usable = [f for f in frames if f["sample_source"] == "face_mesh_skin_patches"]
    if not usable:
        usable = frames

    labs = [f["lab"] for f in usable]
    median_lab = _robust_lab(labs)
    sample = lab_to_rgb(median_lab)

    primary = frames[0]
    lighting_statuses = [str(f["quality"]["status"]) for f in usable]
    if "too_dark" in lighting_statuses and lighting_statuses.count("too_dark") >= max(1, len(usable) // 2):
        lighting_status = "too_dark"
    elif "too_bright" in lighting_statuses and lighting_statuses.count("too_bright") >= max(1, len(usable) // 2):
        lighting_status = "too_bright"
    elif all(s == "harsh_shadows" for s in lighting_statuses):
        lighting_status = "harsh_shadows"
    else:
        lighting_status = str(primary["quality"]["status"])

    region_labs = list(primary["region_labs"].values())
    frame_itas = [
        float(np.degrees(np.arctan2(lab[0] - 50.0, lab[2] if lab[2] else 1e-6)))
        for lab in labs
    ]

    extras = {
        "lighting_status": lighting_status,
        "region_labs": region_labs,
        "frame_itas": frame_itas,
        "frames_used": len(usable),
        "regions_used": len(primary["region_labs"]),
    }

    skin_profile = classify_skin_lab(median_lab, extras)
    top20 = rank_palette(sample, skin_profile)

    log.info(
        "skin_analysis L=%.2f a=%.2f b=%.2f ITA=%.1f hue=%.1f undertone=%s depth=%s "
        "confidence=%.1f frames=%s regions=%s lighting=%s source=%s",
        median_lab[0],
        median_lab[1],
        median_lab[2],
        skin_profile["ita"],
        skin_profile["hue_angle"],
        skin_profile["undertone"],
        skin_profile["depth"],
        skin_profile["confidence"],
        len(usable),
        extras["regions_used"],
        lighting_status,
        primary["sample_source"],
    )

    quality = dict(primary["quality"])
    quality["status"] = lighting_status
    quality["frames_used"] = len(usable)
    quality["frames_received"] = len(frames)

    region = primary["region"]
    return {
        "session_id": session_id,
        "face_detected": any(f["face_detected"] for f in frames),
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
        "skin_regions": {
            name: {"r": round(v[0], 1), "g": round(v[1], 1), "b": round(v[2], 1)}
            for name, v in primary["region_samples"].items()
        },
        "skin_profile": skin_profile,
        "top20": top20,
        "model": {
            "name": MODEL_NAME,
            "version": MODEL_VERSION,
            "face_provider": region.provider,
            "sample_source": primary["sample_source"],
            "white_balance": "none",
            "aggregation": "trimmed_median_lab",
            "scoring": "undertone_harmony+lightness_contrast+chroma_fit-washout",
            "notes": "Camera-based ITA + Lab hue. Not a spectrophotometer.",
            "frames_used": str(len(usable)),
        },
    }
