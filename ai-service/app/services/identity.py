"""
Face + hair preservation after garment transfer.

IDM-VTON is a clothing model. It often warps hair and softens the face.
This stage never invents a new person: it copies the visitor's real face
and hair from the *aligned original capture* onto the generated image,
using a feathered face+hair mask (not a rectangular paste).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .segmentation import get_segmenter
from .skin_sampler import get_face_landmarks

# MediaPipe Face Mesh FACE_OVAL
_FACE_OVAL = (
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365,
    379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93,
    234, 127, 162, 21, 54, 103, 67, 109,
)
_FOREHEAD = 10
_CHIN = 152
_LEFT_EAR = 234
_RIGHT_EAR = 454


def _blur(mask: np.ndarray, radius: float) -> np.ndarray:
    img = Image.fromarray((np.clip(mask, 0.0, 1.0) * 255).astype("uint8"), mode="L")
    return np.array(img.filter(ImageFilter.GaussianBlur(radius=radius)), dtype="float32") / 255.0


def _dilate(mask: np.ndarray, size: int = 9) -> np.ndarray:
    img = Image.fromarray((np.clip(mask, 0.0, 1.0) * 255).astype("uint8"), mode="L")
    return np.array(img.filter(ImageFilter.MaxFilter(size)), dtype="float32") / 255.0


def _erode(mask: np.ndarray, size: int = 5) -> np.ndarray:
    img = Image.fromarray((np.clip(mask, 0.0, 1.0) * 255).astype("uint8"), mode="L")
    return np.array(img.filter(ImageFilter.MinFilter(size)), dtype="float32") / 255.0


def _face_oval_mask(size: Tuple[int, int], landmarks: List[Tuple[int, int]]) -> np.ndarray:
    w, h = size
    canvas = Image.new("L", (w, h), 0)
    pts = [landmarks[i] for i in _FACE_OVAL if i < len(landmarks)]
    if len(pts) < 8:
        return np.zeros((h, w), dtype="float32")
    ImageDraw.Draw(canvas).polygon(pts, fill=255)
    return np.array(canvas, dtype="float32") / 255.0


def _skin_like(rgb: np.ndarray) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    return (r > 80) & (g > 40) & (b > 18) & (r > g + 6) & (r > b + 10)


def identity_mask(original: Image.Image) -> np.ndarray:
    """Soft mask: 1 = keep original face/hair, 0 = keep generated clothing.

    Hair is the head region and strands beside the face — not the dark
    shirt/torso, which used to be copied back and undo the try-on.
    """
    rgb = np.array(original.convert("RGB"))
    h, w = rgb.shape[:2]
    yy, xx = np.ogrid[:h, :w]
    person = np.ones((h, w), dtype="float32")
    segmenter = get_segmenter()
    if segmenter is not None:
        seg = segmenter.segment(original)
        if seg is not None:
            person = seg.astype("float32")

    landmarks = get_face_landmarks(original)
    face = np.zeros((h, w), dtype="float32")
    chin_y = int(h * 0.38)
    forehead_y = int(h * 0.12)
    ear_y = int(h * 0.28)
    left_x = int(w * 0.32)
    right_x = int(w * 0.68)
    if landmarks and len(landmarks) > _CHIN:
        face = _face_oval_mask((w, h), landmarks)
        chin_y = landmarks[_CHIN][1]
        forehead_y = landmarks[_FOREHEAD][1] if len(landmarks) > _FOREHEAD else forehead_y
        if len(landmarks) > _RIGHT_EAR:
            left_x = min(landmarks[_LEFT_EAR][0], landmarks[_RIGHT_EAR][0])
            right_x = max(landmarks[_LEFT_EAR][0], landmarks[_RIGHT_EAR][0])
            ear_y = max(landmarks[_LEFT_EAR][1], landmarks[_RIGHT_EAR][1])
        face = _dilate(face, 11)

    luma = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    face_cx = (left_x + right_x) / 2.0
    face_w = max(16.0, float(right_x - left_x))
    # Central column below the jaw is clothing, not hair.
    torso_half = face_w * 0.82
    torso_col = (xx > face_cx - torso_half) & (xx < face_cx + torso_half) & (yy > chin_y + int(h * 0.012))

    # Head hair: above a line just below the ears, full person width.
    head_ymax = min(h - 1, max(ear_y + int(h * 0.05), forehead_y + int(h * 0.10)))
    head_zone = yy < head_ymax
    # Long hair hanging beside the shoulders, outside the torso column.
    side_zone = (yy < chin_y + int(h * 0.22)) & ~torso_col
    hair = (
        (person > 0.25)
        & ~_skin_like(rgb)
        & (luma < 165)
        & (head_zone | side_zone)
        & ~torso_col
    )
    top = max(0, forehead_y - int(h * 0.14))
    hair[top:forehead_y] |= (person[top:forehead_y] > 0.12) & (luma[top:forehead_y] < 175)

    combined = np.maximum(face, hair.astype("float32"))
    combined = np.maximum(combined, _dilate(combined, 7) * 0.55)
    combined = np.clip(combined - torso_col.astype("float32") * 0.85, 0.0, 1.0)
    combined = _blur(combined, 2.6)
    return np.clip(combined, 0.0, 1.0)


def clothing_replace_mask(person: Image.Image, category: str) -> Optional[Image.Image]:
    """White paint over clothing only — face and hair stay unmasked for IDM-VTON."""
    segmenter = get_segmenter()
    if segmenter is None:
        return None
    body = segmenter.segment(person)
    if body is None:
        return None
    ident = identity_mask(person)
    clothing = np.clip(body.astype("float32") - _dilate(ident, 9), 0.0, 1.0)
    h, w = clothing.shape
    if category == "dresses":
        pass
    elif category == "lower_body":
        clothing[: int(h * 0.40)] = 0.0
    else:
        clothing[int(h * 0.70) :] = 0.0
    clothing = _erode(clothing, 3)
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    paint = clothing > 0.32
    if not paint.any():
        clothing = np.clip(body.astype("float32") - ident, 0.0, 1.0)
        if category == "dresses":
            pass
        elif category == "lower_body":
            clothing[: int(h * 0.40)] = 0.0
        else:
            clothing[int(h * 0.70) :] = 0.0
        paint = clothing > 0.32
    if not paint.any():
        return None
    rgba[paint] = (255, 255, 255, 255)
    return Image.fromarray(rgba, "RGBA")


def _unsharp_face(rgb: np.ndarray, face_mask: np.ndarray, amount: float = 0.35) -> np.ndarray:
    """Mild sharpening on the face only — no beautify, no identity change."""
    img = Image.fromarray(rgb, mode="RGB")
    blur = img.filter(ImageFilter.GaussianBlur(radius=0.9))
    sharp = np.clip(
        np.array(img, dtype=np.float32) + amount * (np.array(img, dtype=np.float32) - np.array(blur, dtype=np.float32)),
        0,
        255,
    )
    m = face_mask[:, :, None]
    return np.clip(rgb.astype(np.float32) * (1.0 - m) + sharp * m, 0, 255).astype(np.uint8)


def preserve_identity(original: Image.Image, generated: Image.Image) -> Tuple[Image.Image, Dict[str, Any]]:
    """Keep the visitor's face on the generated clothing without a hair paste.

    Hair stays on the generated image. IDM-VTON is already told (via the
    clothing mask) not to rewrite face/hair. This only softly restores the
    interior of the face oval if the clothing model softened it.
    """
    orig = original.convert("RGB").resize(generated.size, Image.LANCZOS)
    gen = generated.convert("RGB")
    landmarks = get_face_landmarks(orig)
    if not landmarks:
        return gen, {"identity_preserved": False, "reason": "no_face_landmarks", "coverage": 0.0}

    w, h = orig.size
    face = _face_oval_mask((w, h), landmarks)
    face = _erode(face, 5)
    face = _blur(face, 6.5)
    coverage = float(face.mean())
    if coverage < 0.008:
        return gen, {"identity_preserved": False, "reason": "face_mask_too_small", "coverage": coverage}

    a = face[:, :, None]
    blended = np.clip(
        np.array(gen, dtype=np.float32) * (1.0 - a) + np.array(orig, dtype=np.float32) * a,
        0,
        255,
    ).astype(np.uint8)
    blended = _unsharp_face(blended, face, amount=0.22)
    return Image.fromarray(blended, mode="RGB"), {
        "identity_preserved": True,
        "coverage": round(coverage, 3),
        "face_enhanced": True,
        "hair_pasted": False,
    }
