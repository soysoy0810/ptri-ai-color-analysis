"""
Virtual try-on — provider-based, swappable backend.

Preview → POST /tryon → virtual_tryon() → VTON_PROVIDER → generated image.

The frontend never selects the model. Set VTON_PROVIDER in ai-service/.env:

    catvton / local     CatVTON on VTON_LOCAL_URL (POST /generate) — preferred
    huggingface_idm_vton / huggingface
                        IDM-VTON Hugging Face ZeroGPU Space (optional fallback)
    huggingface_catvton CatVTON Hugging Face ZeroGPU Space (same quota pool)
    local_server        IDM-VTON on VTON_LOCAL_URL (POST /tryon)
    mock / test         always fails in kiosk mode
    none                honest failure — generates nothing
    replicate           paid — do not enable unless approved

Generation must not depend on the IDM-VTON ZeroGPU quota. Weights may be
downloaded from Hugging Face once onto a separate NVIDIA box; that is not
the same as calling the public Space for every look.

If no provider returns a real generated image, this returns ok=False with
the provider error. It never returns the user's photo, a collage, or a
catalog model dressed up as success.
"""

from __future__ import annotations

import base64
import io
import os
import re
import tempfile
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Tuple

import numpy as np
from PIL import Image, ImageFilter

from .identity import clothing_replace_mask, identity_mask, preserve_identity
from .skin_sampler import get_face_landmarks

from ..core.config import (
    CATVTON_GUIDANCE,
    CATVTON_SPACE,
    CATVTON_STEPS,
    HF_TOKEN,
    HF_VTON_ATTEMPTS,
    HF_VTON_BACKOFF,
    HF_VTON_SPACE,
    HF_VTON_SPACES,
    HF_VTON_TIMEOUT,
    REPLICATE_API_TOKEN,
    TRYON_MODEL,
    TRYON_STEPS,
    VTON_ALLOW_MOCK,
    VTON_FALLBACK_PROVIDER,
    VTON_LOCAL_MODEL,
    VTON_LOCAL_TIMEOUT,
    VTON_LOCAL_URL,
    VTON_PROVIDER as VTON_PROVIDER_RAW,
)


PROVIDER_ALIASES = {
    "huggingface_idm_vton": "huggingface",
    "huggingface": "huggingface",
    "hf": "huggingface",
    "idm-vton": "huggingface",
    "idm_vton": "huggingface",
    "huggingface_catvton": "catvton_hf",
    "catvton_hf": "catvton_hf",
    "catvton": "catvton",
    "local": "local",
    "local_mac": "local",
    "local_server": "local_server",
    "mock": "mock",
    "test": "mock",
    "replicate": "replicate",
    "none": "none",
}


def normalize_provider(name: str | None) -> str:
    raw = (name or "none").strip().lower()
    return PROVIDER_ALIASES.get(raw, raw or "none")


VTON_PROVIDER = normalize_provider(VTON_PROVIDER_RAW)
VTON_FALLBACK = normalize_provider(VTON_FALLBACK_PROVIDER) if VTON_FALLBACK_PROVIDER else ""
if VTON_FALLBACK == VTON_PROVIDER:
    VTON_FALLBACK = ""

_hf_quota_until = 0.0


def _safe_exc(text: str) -> str:
    """Exception text for logs/UI — never include API tokens."""
    cleaned = re.sub(r"hf_[A-Za-z0-9]+", "hf_***", str(text))
    cleaned = re.sub(r"r8_[A-Za-z0-9]+", "r8_***", cleaned)
    return cleaned[:400]


def _tryon_log(event: str, **fields: Any) -> None:
    parts = [f"{k}={v!r}" for k, v in fields.items()]
    print(f"[tryon] {event} {' '.join(parts)}", flush=True)


def _quota_wait_s(text: str) -> int | None:
    match = re.search(r"try again in (\d+):(\d+):(\d+)", text, re.I)
    if not match:
        return None
    hours, minutes, seconds = (int(match.group(1)), int(match.group(2)), int(match.group(3)))
    return hours * 3600 + minutes * 60 + seconds


def _wait_phrase(seconds: int) -> str:
    hours, rem = divmod(max(0, seconds), 3600)
    minutes = max(1, rem // 60) if seconds >= 60 else 1
    if hours >= 1:
        return f"about {hours} hours {minutes} minutes"
    return f"about {minutes} minutes"


def _quota_message(attempts: list) -> str:
    joined = " ".join(str(a) for a in attempts)
    wait = _quota_wait_s(joined)
    if wait is None:
        return "The free IDM-VTON GPU quota is exhausted. Please tap Retry later."
    return (
        "The free IDM-VTON GPU quota is exhausted. "
        f"Hugging Face says try again in {_wait_phrase(wait)}."
    )

# What each provider can actually generate. The kiosk must not invent
# accessories/backgrounds in the browser when the model cannot do them.
PROVIDER_CAPABILITIES: Dict[str, Dict[str, Any]] = {
    "huggingface": {
        "model": "IDM-VTON",
        "space": HF_VTON_SPACE,
        "generates_image": True,
        "garment_transfer": True,
        "textile_on_garment_reference": True,
        "accessories": False,
        "background_generation": False,
        "lighting_control": False,
        "identity_preserving": True,
        "runs_locally_on_this_mac": False,
        "hardware": (
            "Remote Hugging Face ZeroGPU (NVIDIA). "
            "IDM-VTON needs ~22 GB CUDA VRAM. This Mac (Apple Silicon, 16 GB, no NVIDIA) cannot run it."
        ),
    },
    "hf": {
        "model": "IDM-VTON",
        "space": HF_VTON_SPACE,
        "generates_image": True,
        "garment_transfer": True,
        "textile_on_garment_reference": True,
        "accessories": False,
        "background_generation": False,
        "lighting_control": False,
        "identity_preserving": True,
        "runs_locally_on_this_mac": False,
        "hardware": (
            "Remote Hugging Face ZeroGPU (NVIDIA). "
            "IDM-VTON needs ~22 GB CUDA VRAM. This Mac cannot run it."
        ),
    },
    "local_server": {
        "model": "IDM-VTON",
        "generates_image": True,
        "garment_transfer": True,
        "textile_on_garment_reference": True,
        "accessories": False,
        "background_generation": False,
        "lighting_control": False,
        "identity_preserving": True,
        "runs_locally_on_this_mac": False,
        "hardware": f"Separate NVIDIA box at {VTON_LOCAL_URL}. Not this Mac.",
    },
    "local": {
        "model": "Local clothing fit",
        "generates_image": True,
        "garment_transfer": True,
        "textile_on_garment_reference": True,
        "accessories": False,
        "background_generation": False,
        "lighting_control": False,
        "identity_preserving": True,
        "runs_locally_on_this_mac": True,
        "hardware": (
            "This Mac (MediaPipe clothing mask + prepared garment). "
            "Not IDM-VTON, not CatVTON, not ZeroGPU."
        ),
    },
    "catvton": {
        "model": "CatVTON",
        "generates_image": True,
        "garment_transfer": True,
        "textile_on_garment_reference": True,
        "accessories": False,
        "background_generation": False,
        "lighting_control": False,
        "identity_preserving": True,
        "runs_locally_on_this_mac": False,
        "hardware": (
            f"Remote CatVTON GPU server at {VTON_LOCAL_URL}. "
            "Needs ~8 GB NVIDIA VRAM (bf16, 1024x768). This Mac cannot run it."
        ),
    },
    "catvton_hf": {
        "model": "CatVTON",
        "space": CATVTON_SPACE,
        "generates_image": True,
        "garment_transfer": True,
        "textile_on_garment_reference": True,
        "accessories": False,
        "background_generation": False,
        "lighting_control": False,
        "identity_preserving": True,
        "runs_locally_on_this_mac": False,
        "hardware": (
            "Remote Hugging Face ZeroGPU (NVIDIA) running CatVTON. "
            "Shares the same ZeroGPU quota pool as IDM-VTON."
        ),
    },
    "mock": {
        "model": None,
        "generates_image": False,
        "garment_transfer": False,
        "accessories": False,
        "background_generation": False,
        "lighting_control": False,
        "runs_locally_on_this_mac": False,
        "hardware": "Test stub. Never returns a fashion image in kiosk mode.",
    },
    "none": {
        "model": None,
        "generates_image": False,
        "garment_transfer": False,
        "accessories": False,
        "background_generation": False,
        "lighting_control": False,
        "runs_locally_on_this_mac": False,
        "hardware": "No try-on engine enabled.",
    },
    "replicate": {
        "model": TRYON_MODEL,
        "generates_image": True,
        "garment_transfer": True,
        "accessories": False,
        "background_generation": False,
        "lighting_control": False,
        "identity_preserving": True,
        "runs_locally_on_this_mac": False,
        "hardware": "Paid Replicate NVIDIA GPU. Disabled unless explicitly approved.",
    },
}


@dataclass
class TryOnResult:
    ok: bool
    image_data_url: Optional[str] = None
    status: str = ""
    message: str = ""
    provider: str = VTON_PROVIDER
    diagnostics: Dict[str, Any] = field(default_factory=dict)


def _decode(data_url: str) -> Image.Image:
    raw = data_url.split(",", 1)[1] if "," in data_url else data_url
    return Image.open(io.BytesIO(base64.b64decode(raw)))


def _encode_data_url(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=92)
    return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('ascii')}"


def _hex_to_rgb(value: str) -> Tuple[int, int, int]:
    raw = value.strip().lstrip("#")
    if len(raw) == 3:
        raw = "".join(ch * 2 for ch in raw)
    n = int(raw, 16)
    return (n >> 16) & 255, (n >> 8) & 255, n & 255


def _cloth_bool(mask: Image.Image | None, rgb: np.ndarray) -> np.ndarray:
    if mask is not None:
        return np.array(mask.convert("L")) > 16
    return ~((rgb[:, :, 0] > 250) & (rgb[:, :, 1] > 250) & (rgb[:, :, 2] > 250))


def recolor_garment(image: Image.Image, hex_color: str, mask: Image.Image | None = None) -> Image.Image:
    """Tint the garment *reference* to the selected fabric color.

    Uses the cloth mask from prepare_garment. Highlight folds on a pale
    blouse are still cloth — they must not be treated as white backdrop.
    """
    try:
        target = np.array(_hex_to_rgb(hex_color), dtype=np.float32)
    except ValueError:
        return image

    arr = np.array(image.convert("RGB"), dtype=np.float32)
    luma = arr @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    cloth = _cloth_bool(mask, arr)
    colored = np.clip(target * (luma[:, :, None] / 255.0) * 1.12, 0, 255)
    out = np.where(cloth[:, :, None], colored, arr)
    return Image.fromarray(out.astype(np.uint8), "RGB")


def prepare_garment(image: Image.Image) -> tuple[Image.Image, Image.Image]:
    """Put the garment on a white studio ground without eating fabric.

    Dark T'nalak, navy, black folds and embroidery must stay. Only pixels
    that are (1) connected to the image border and (2) clearly the studio
    backdrop are removed — never "every dark pixel" or "every colour like
    the border".
    """
    rgba = image.convert("RGBA")
    arr = np.array(rgba)
    rgb = arr[:, :, :3].astype(np.int16)
    alpha = arr[:, :, 3].copy()
    h, w = alpha.shape

    border = np.concatenate([rgb[0, :, :], rgb[-1, :, :], rgb[:, 0, :], rgb[:, -1, :]], axis=0)
    border_alpha = np.concatenate([alpha[0, :], alpha[-1, :], alpha[:, 0], alpha[:, -1]])
    opaque_border = border[border_alpha > 16]
    if len(opaque_border):
        bg = opaque_border.mean(axis=0)
        luma = rgb.mean(axis=2)
        if bg.mean() > 200:
            similar = luma > 248
        elif bg.mean() < 40:
            # Pure black studio only — navy/charcoal fabric is not backdrop.
            similar = rgb.max(axis=2) < 8
        else:
            similar = np.abs(rgb - bg).sum(axis=2) < 28
        visited = np.zeros((h, w), dtype=bool)
        stack: list[tuple[int, int]] = []
        for x in range(w):
            if similar[0, x]:
                stack.append((0, x))
            if similar[h - 1, x]:
                stack.append((h - 1, x))
        for y in range(h):
            if similar[y, 0]:
                stack.append((y, 0))
            if similar[y, w - 1]:
                stack.append((y, w - 1))
        backdrop = np.zeros((h, w), dtype=bool)
        while stack:
            y, x = stack.pop()
            if y < 0 or x < 0 or y >= h or x >= w or visited[y, x]:
                continue
            visited[y, x] = True
            if not similar[y, x]:
                continue
            backdrop[y, x] = True
            stack.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))
        alpha = np.where(backdrop, 0, alpha).astype(np.uint8)

    cutout = Image.fromarray(np.dstack([arr[:, :, :3], alpha]), mode="RGBA")
    white = Image.new("RGB", cutout.size, (255, 255, 255))
    white.paste(cutout, mask=cutout.split()[3])
    cloth = Image.fromarray(np.where(alpha > 16, 255, 0).astype(np.uint8), "L")
    return white, cloth


def _to_temp_png(img: Image.Image) -> str:
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    img.save(tmp.name)
    tmp.close()
    return tmp.name


def _fit_portrait(img: Image.Image, size=(768, 1024), mode: str = "cover") -> Image.Image:
    """Fit the person into IDM-VTON's 3:4 frame without a beige studio rectangle.

    Cover is used when the capture is already near 3:4 (typical kiosk 4:5 crop).
    Tall full-body frames use contain with a blurred-edge pad so feet stay in
    frame and no cream letterbox is sent to the model.
    """
    src = img.convert("RGB")
    tw, th = size
    src_aspect = src.width / max(1, src.height)
    dst_aspect = tw / th
    use_contain = mode == "contain" or (mode != "cover" and abs(src_aspect - dst_aspect) >= 0.12)
    if mode == "contain" or (use_contain and mode != "cover"):
        fill = src.resize(size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(28))
        fitted = src.copy()
        fitted.thumbnail(size, Image.LANCZOS)
        canvas = fill
        x = (tw - fitted.width) // 2
        y = (th - fitted.height) // 2
        canvas.paste(fitted, (x, y))
        return canvas

    scale = max(tw / src.width, th / src.height)
    nw = max(tw, int(round(src.width * scale)))
    nh = max(th, int(round(src.height * scale)))
    fitted = src.resize((nw, nh), Image.LANCZOS)
    left = max(0, (nw - tw) // 2)
    top = 0 if nh >= th else max(0, (nh - th) // 2)
    return fitted.crop((left, top, left + tw, top + th))


def _to_temp_upload(
    img: Image.Image,
    max_size=(768, 1024),
    portrait: bool = False,
    view: str = "half",
) -> str:
    """Writes a *small* JPEG for upload to a remote try-on Space.

    IDM-VTON internally works at 768x1024, so shipping the kiosk's full-
    resolution capture is pure upload cost: a 2.4 MB PNG was enough to trip
    httpx's write timeout before the model ever ran. Downscaling first makes
    the upload a few hundred KB and costs nothing in output quality.

    `portrait` additionally forces the model's 3:4 frame — correct for the
    person, wrong for a garment cutout, whose own aspect must be preserved.
    """
    if portrait:
        small = _fit_portrait(img, max_size, mode="contain")
    else:
        small = img.copy()
        small.thumbnail(max_size, Image.LANCZOS)
    if small.mode != "RGB":
        small = small.convert("RGB")
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    small.save(tmp.name, "JPEG", quality=90, optimize=True)
    tmp.close()
    return tmp.name


def apply_textile(
    garment: Image.Image, textile: Image.Image, mask: Image.Image | None = None
) -> Image.Image:
    """Maps a Philippine textile photo onto the garment *reference* only.

    The diffusion model then transfers that prepared garment onto the person.
    This is not an overlay on the visitor photograph.
    """
    sized = textile.convert("RGB").resize(garment.size, Image.LANCZOS)
    arr = np.array(garment.convert("RGB"), dtype=np.float32)
    tex = np.array(sized, dtype=np.float32)
    luma = arr @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    cloth = _cloth_bool(mask, arr)
    # Floor the shade so dark navy/T'nalak cloth still shows the weave.
    shade = np.clip(0.42 + 0.70 * (luma / 255.0), 0.42, 1.15)
    mapped = np.clip(tex * shade[:, :, None], 0, 255)
    out = np.where(cloth[:, :, None], mapped, arr)
    return Image.fromarray(out.astype(np.uint8), "RGB")


def tint_pattern(
    garment: Image.Image, hex_color: str, strength: float = 0.42, mask: Image.Image | None = None
) -> Image.Image:
    """Shift a patterned garment toward a selected color without erasing the weave."""
    try:
        target = np.array(_hex_to_rgb(hex_color), dtype=np.float32)
    except ValueError:
        return garment
    arr = np.array(garment.convert("RGB"), dtype=np.float32)
    luma = arr @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    cloth = _cloth_bool(mask, arr)
    colored = np.clip(target * (luma[:, :, None] / 255.0) * 1.1, 0, 255)
    mixed = arr * (1.0 - strength) + colored * strength
    out = np.where(cloth[:, :, None], mixed, arr)
    return Image.fromarray(out.astype(np.uint8), "RGB")


def _validate_person(person: Image.Image) -> str | None:
    w, h = person.size
    if min(w, h) < 160:
        return "Person image is too small for garment transfer."
    arr = np.array(person.convert("L"), dtype=np.float32)
    if float(arr.mean()) < 28:
        return "Person image is too dark."
    if float(arr.mean()) > 245:
        return "Person image is too bright."
    # Laplacian-ish blur: variance of a simple high-pass.
    sharp = float(np.var(arr[1:, 1:] - arr[:-1, :-1]))
    if sharp < 8:
        return "Person image is too blurry for garment transfer."
    return None


def _validate_garment(garment: Image.Image, mask: Image.Image | None = None) -> str | None:
    arr = np.array(garment.convert("RGB"))
    cloth = float(_cloth_bool(mask, arr).mean())
    if cloth < 0.04:
        return "Garment image has almost no clothing pixels after preparation."
    return None


def _letterbox_artifact(result: Image.Image) -> bool:
    """True only for the old cream studio bars (#ece8e2), not a gray VTON backdrop."""
    arr = np.array(result.convert("RGB"), dtype=np.float32)
    h, w = arr.shape[:2]
    band = max(6, int(min(h, w) * 0.06))
    cream = np.array([236.0, 232.0, 226.0], dtype=np.float32)

    def cream_strip(strip: np.ndarray) -> bool:
        mean = strip.reshape(-1, 3).mean(axis=0)
        std = float(strip.std())
        return std < 8 and float(np.abs(mean - cream).mean()) < 8

    return (
        cream_strip(arr[:, :band])
        or cream_strip(arr[:, w - band :])
        or cream_strip(arr[:band, :])
        or cream_strip(arr[h - band :, :])
    )


def _validate_result(person: Image.Image, result: Image.Image) -> str | None:
    """Only reject a truly broken image. Gray studio backdrops from IDM-VTON
    used to be treated as letterbox artifacts and discarded after a successful GPU run.
    """
    del person  # comparison is diagnostic-only; callers still compute torso MAE
    if result.size[0] < 64 or result.size[1] < 64:
        return "The try-on model returned an invalid image size."
    return None


def _portrait_fit_mode(img: Image.Image, view: str) -> str:
    """Cover for kiosk 4:5/3:4 scans. Contain only for a true full-length photo."""
    if str(view or "half") != "full":
        return "cover"
    if img.height / max(1, img.width) >= 1.7:
        return "contain"
    return "cover"


def _torso_mae(person: Image.Image, result: Image.Image) -> float:
    """Mean absolute difference on the lower 60% (torso), ignoring the face."""
    a = _fit_portrait(person.convert("RGB"), (96, 128))
    b = result.convert("RGB").resize((96, 128), Image.LANCZOS)
    da = np.array(a, dtype=np.float32)[int(128 * 0.38) :]
    db = np.array(b, dtype=np.float32)[int(128 * 0.38) :]
    return float(np.mean(np.abs(da - db)))


def _garment_prompt(description: str, category: str, textile_name: str = "") -> str:
    """Expands a bare catalog name into a description the model can act on.

    The kiosk only knows the design's display name ("Modern Filipiniana"),
    which tells IDM-VTON nothing about how the piece should sit. Naming the
    garment type and pinning the neckline/sleeves to the reference stops the
    model inventing a deeper opening than the actual PTRI garment has.
    """
    kind = {
        "dresses": "dress",
        "lower_body": "trousers",
    }.get(category, "top")
    desc = (description or "garment").strip() or "garment"
    textile = (textile_name or "").strip()
    fabric = f", woven in {textile} Philippine textile" if textile else ""
    if category == "dresses":
        return (
            f"{desc}{fabric}, a complete full-length dress replacing the person's "
            "shirt and trousers, V-neck, sleeves, waist and skirt hem as in the "
            "reference, fitted naturally on the body"
        )
    return (
        f"{desc}{fabric}, worn as a {kind}, fitted naturally on the body with the "
        "neckline, collar and sleeve length exactly as in the reference garment"
    )


def _person_replace_mask(person: Image.Image, category: str) -> Optional[Image.Image]:
    """Paint the clothing region IDM-VTON should replace.

    Face and hair are excluded so the clothing model cannot rewrite the
    visitor's identity. Dresses still cover torso through feet.
    """
    return clothing_replace_mask(person, category)


def probe_runtime() -> Dict[str, Any]:
    """Reports what this machine can actually run — used to explain, precisely,
    why local generation is or isn't available rather than guessing."""
    info: Dict[str, Any] = {
        "provider": VTON_PROVIDER,
        "model": (PROVIDER_CAPABILITIES.get(VTON_PROVIDER) or {}).get("model"),
        "capabilities": PROVIDER_CAPABILITIES.get(VTON_PROVIDER, PROVIDER_CAPABILITIES["none"]),
        "torch_installed": False,
        "cuda_available": False,
        "mps_available": False,
        "device": None,
    }

    if VTON_PROVIDER == "local":
        info["mode"] = "local_mac"
        info["available"] = True
        info["device"] = "cpu"
        return info

    if VTON_PROVIDER in ("local_server", "catvton"):
        # Inference is off-box, so local torch/GPU is irrelevant here — what
        # matters is whether our own server is actually answering.
        info["url"] = VTON_LOCAL_URL
        info["mode"] = "remote_gpu"
        info["local_model"] = VTON_LOCAL_MODEL if VTON_PROVIDER == "local_server" else "catvton"
        try:
            import requests

            health = requests.get(f"{VTON_LOCAL_URL}/health", timeout=5)
            info["server_reachable"] = health.status_code == 200
            if health.status_code == 200:
                try:
                    body = health.json()
                    info["gpu"] = body.get("gpu") or body.get("device")
                    info["server_model"] = body.get("model")
                    info["available"] = bool(body.get("ok", True)) and bool(
                        body.get("ready", True)
                    )
                    if body.get("reason"):
                        info["reason"] = body["reason"]
                except Exception:
                    info["available"] = True
            else:
                info["available"] = False
                info["reason"] = f"Try-on server HTTP {health.status_code} at {VTON_LOCAL_URL}"
        except Exception as exc:  # noqa: BLE001
            info["server_reachable"] = False
            info["available"] = False
            info["reason"] = f"No try-on server at {VTON_LOCAL_URL}: {_safe_exc(exc)}"
        return info

    if VTON_PROVIDER in ("huggingface", "hf", "catvton_hf"):
        # The free path needs no local GPU at all — what matters is whether the
        # client is installed and whether we're calling the Space authenticated.
        info["space"] = CATVTON_SPACE if VTON_PROVIDER == "catvton_hf" else HF_VTON_SPACE
        info["authenticated"] = bool(HF_TOKEN)
        info["mode"] = "zerogpu"
        if time.time() < _hf_quota_until:
            remaining = int(_hf_quota_until - time.time())
            info["available"] = False
            info["reason"] = (
                "ZeroGPU quota exhausted. "
                f"Hugging Face says try again in {_wait_phrase(remaining)}."
            )
        try:
            import gradio_client  # noqa: F401

            info["gradio_client_installed"] = True
        except ImportError:
            info["gradio_client_installed"] = False
            info["available"] = False
            info["reason"] = "gradio_client is not installed in the AI service environment."

    try:
        import torch

        info["torch_installed"] = True
        info["torch_version"] = torch.__version__
        info["cuda_available"] = bool(torch.cuda.is_available())
        info["mps_available"] = bool(
            getattr(torch.backends, "mps", None) and torch.backends.mps.is_available()
        )
        info["device"] = "cuda" if info["cuda_available"] else ("mps" if info["mps_available"] else "cpu")
    except ImportError:
        if VTON_PROVIDER not in ("huggingface", "hf") and "reason" not in info:
            info["reason"] = "PyTorch is not installed in the AI service environment."
    return info


def tryon_status() -> Dict[str, Any]:
    """Internal provider status for operators — never includes tokens."""
    runtime = probe_runtime()
    caps = PROVIDER_CAPABILITIES.get(VTON_PROVIDER, PROVIDER_CAPABILITIES["none"])
    available = runtime.get("available")
    if available is None:
        if VTON_PROVIDER in ("huggingface", "hf", "catvton_hf"):
            available = bool(runtime.get("gradio_client_installed")) and "reason" not in runtime
        elif VTON_PROVIDER == "local":
            available = True
        elif VTON_PROVIDER in ("catvton", "local_server"):
            available = bool(runtime.get("server_reachable"))
        else:
            available = False
    reason = runtime.get("reason")
    if VTON_PROVIDER in ("huggingface", "hf") and time.time() < _hf_quota_until:
        remaining = int(_hf_quota_until - time.time())
        available = False
        reason = (
            "ZeroGPU quota exhausted. "
            f"Hugging Face says try again in {_wait_phrase(remaining)}."
        )
    mode = runtime.get("mode") or (
        "local_mac"
        if VTON_PROVIDER == "local"
        else "zerogpu"
        if VTON_PROVIDER in ("huggingface", "hf", "catvton_hf")
        else "remote_gpu"
        if VTON_PROVIDER in ("catvton", "local_server")
        else "none"
    )
    return {
        "provider": VTON_PROVIDER,
        "available": bool(available),
        "mode": mode,
        "model": caps.get("model"),
        "reason": reason,
        "fallback": _effective_fallback() or None,
        "configured_fallback": VTON_FALLBACK or None,
        "authenticated": bool(HF_TOKEN) if VTON_PROVIDER in ("huggingface", "hf", "catvton_hf") else False,
        "space": runtime.get("space"),
        "url": runtime.get("url"),
        "server_reachable": runtime.get("server_reachable"),
        "hardware": caps.get("hardware"),
        "full_body_from_face_only": False,
        "notes": (
            "CatVTON and IDM-VTON both transfer a garment onto the supplied person photo. "
            "Neither invents a realistic full-body figure from a face-only crop."
        ),
    }


# --------------------------------------------------------------------------
# Providers
# --------------------------------------------------------------------------


def _provider_none(*_args, **_kwargs) -> TryOnResult:
    runtime = probe_runtime()
    return TryOnResult(
        ok=False,
        status="model_not_available",
        provider="none",
        message=(
            "Local virtual try-on requires a different AI runtime/GPU. "
            "No try-on engine is currently enabled, so no image was generated."
        ),
        diagnostics=runtime,
    )


def _local_clothing_fit(
    person: Image.Image,
    garment: Image.Image,
    category: str,
    cloth_mask: Optional[Image.Image] = None,
) -> Tuple[Optional[Image.Image], str]:
    """Place the prepared garment into the visitor's clothing region on this Mac."""
    fitted = _fit_portrait(
        person.convert("RGB"),
        (768, 1024),
        mode=_portrait_fit_mode(person, "half"),
    )
    h, w = fitted.size[1], fitted.size[0]
    mask_img = _person_replace_mask(fitted, category)
    if mask_img is None:
        return None, "Could not find a clothing region on the session photo."

    body = np.array(mask_img.convert("L"), dtype=np.float32) / 255.0
    ident = identity_mask(fitted)
    body = np.clip(body - _dilate_mask(ident, 11), 0.0, 1.0)

    landmarks = get_face_landmarks(fitted)
    if landmarks and len(landmarks) > 152:
        chin_y = landmarks[152][1]
        shoulder_y = max(0, chin_y - int(h * 0.06))
        if category == "dresses":
            body[shoulder_y:, :] = np.maximum(body[shoulder_y:, :], 0.55)
            body[int(h * 0.88) :, :] = 0.0
        elif category == "upper_body":
            body[shoulder_y : int(h * 0.72), :] = np.maximum(body[shoulder_y : int(h * 0.72), :], 0.45)
        else:
            body[int(h * 0.42) :, :] = np.maximum(body[int(h * 0.42) :, :], 0.45)

    body = _blur_alpha(body, 5.0)
    paint = body > 0.2
    if int(paint.sum()) < 400:
        return None, "The clothing mask was too small to place a garment."

    g_rgb = garment.convert("RGB")
    if cloth_mask is not None:
        g_alpha = np.array(cloth_mask.convert("L").resize(g_rgb.size, Image.BILINEAR), dtype=np.float32) / 255.0
    else:
        g_arr = np.array(g_rgb, dtype=np.float32)
        g_alpha = 1.0 - np.clip((g_arr.min(axis=2) - 240.0) / 15.0, 0.0, 1.0)
    if float(g_alpha.mean()) < 0.04:
        g_alpha = np.ones((g_rgb.size[1], g_rgb.size[0]), dtype=np.float32)

    g_rgba = np.dstack([np.array(g_rgb, dtype=np.float32), np.clip(g_alpha, 0, 1) * 255.0]).astype(np.uint8)
    g_img = Image.fromarray(g_rgba, "RGBA")

    # Cover-scale the garment to the full clothing mask bounds.
    ys, xs = np.where(paint)
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    box_w = max(8, x1 - x0 + 1)
    box_h = max(8, y1 - y0 + 1)
    scale = max(box_w / max(1, g_img.width), box_h / max(1, g_img.height))
    nw = max(box_w, int(round(g_img.width * scale)))
    nh = max(box_h, int(round(g_img.height * scale)))
    g_scaled = g_img.resize((nw, nh), Image.LANCZOS)
    crop_top = 0 if category == "dresses" else max(0, int(nh * 0.08))
    left = max(0, (nw - box_w) // 2)
    top = min(crop_top, max(0, nh - box_h))
    g_crop = g_scaled.crop((left, top, left + box_w, top + box_h))

    placed = np.array(g_crop, dtype=np.float32)
    cloth = placed[:, :, :3]
    g_a = placed[:, :, 3] / 255.0
    region_body = body[y0 : y0 + box_h, x0 : x0 + box_w]
    mix = np.clip(region_body * g_a, 0.0, 1.0)
    mix = _blur_alpha(mix, 2.0)

    person_arr = np.array(fitted, dtype=np.float32)
    luma = person_arr[y0 : y0 + box_h, x0 : x0 + box_w] @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    shade = np.clip(0.5 + 0.65 * (luma / 255.0), 0.42, 1.18)
    mapped = np.clip(cloth * shade[:, :, None], 0, 255)
    a = mix[:, :, None]
    person_arr[y0 : y0 + box_h, x0 : x0 + box_w] = mapped * a + person_arr[y0 : y0 + box_h, x0 : x0 + box_w] * (1.0 - a)
    return Image.fromarray(person_arr.astype(np.uint8), "RGB"), ""


def _dilate_mask(mask: np.ndarray, size: int) -> np.ndarray:
    img = Image.fromarray((np.clip(mask, 0.0, 1.0) * 255).astype("uint8"), "L")
    return np.array(img.filter(ImageFilter.MaxFilter(size if size % 2 else size + 1)), dtype=np.float32) / 255.0


def _blur_alpha(mask: np.ndarray, radius: float) -> np.ndarray:
    img = Image.fromarray((np.clip(mask, 0.0, 1.0) * 255).astype("uint8"), "L")
    return np.array(img.filter(ImageFilter.GaussianBlur(radius=radius)), dtype=np.float32) / 255.0


def _provider_local(person: Image.Image, garment: Image.Image, options: Dict[str, Any]) -> TryOnResult:
    """On-Mac clothing fit. No Hugging Face, no paid API, no CUDA."""
    category = str(options.get("category") or "upper_body")
    started = time.time()
    image, err = _local_clothing_fit(
        person, garment, category, options.get("_cloth_mask")
    )
    if image is None:
        return TryOnResult(
            ok=False,
            status="generation_failed",
            provider="local",
            message=err or "Local try-on could not place the garment.",
        )
    encoded = _encode_data_url(image)
    _tryon_log(
        "local_ok",
        elapsed_s=round(time.time() - started, 1),
        person=f"{person.size[0]}x{person.size[1]}",
        garment=f"{garment.size[0]}x{garment.size[1]}",
        category=category,
    )
    return TryOnResult(
        ok=True,
        image_data_url=encoded,
        status="generated",
        provider="local",
        diagnostics={
            "model": "Local clothing fit",
            "generated_by": "local_clothing_fit",
            "composited": True,
            "elapsed_s": round(time.time() - started, 1),
            "output_size": list(image.size),
        },
    )


_hf_clients: Dict[str, Any] = {}
_hf_client_lock = threading.Lock()


def _hf_client(space: str):
    """Reuse one Gradio client per Space — reconnecting on every try-on adds ~10s."""
    from gradio_client import Client

    with _hf_client_lock:
        cached = _hf_clients.get(space)
        if cached is not None:
            return cached
        client = Client(space, hf_token=HF_TOKEN or None, verbose=False)
        _hf_clients[space] = client
        return client


def _drop_hf_client(space: str) -> None:
    with _hf_client_lock:
        _hf_clients.pop(space, None)


def _predict_with_timeout(client: Any, *args: Any, timeout: float, **kwargs: Any) -> Any:
    box: Dict[str, Any] = {}

    def _run() -> None:
        try:
            box["value"] = client.predict(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001
            box["error"] = exc

    worker = threading.Thread(target=_run, daemon=True)
    worker.start()
    worker.join(timeout)
    if worker.is_alive():
        raise TimeoutError(f"IDM-VTON did not return within {int(timeout)}s")
    if "error" in box:
        raise box["error"]
    if "value" not in box:
        raise TimeoutError("IDM-VTON returned no result")
    return box["value"]


def _vton_local_reachable() -> bool:
    try:
        import requests

        health = requests.get(f"{VTON_LOCAL_URL}/health", timeout=1.5)
        return health.status_code == 200
    except Exception:
        return False


def _effective_fallback() -> str:
    """Optional second engine. Never silently switch to Hugging Face ZeroGPU."""
    configured = VTON_FALLBACK
    if not configured or configured in ("huggingface", "hf", "catvton_hf", "replicate"):
        return ""
    if configured in ("catvton", "local_server") and not _vton_local_reachable():
        return ""
    return configured


def _space_host(space: str) -> str:
    slug = space.strip().replace("/", "-").lower()
    return f"https://{slug}.hf.space"


def _gradio_auth_headers() -> Dict[str, str]:
    headers = {"Accept": "application/json"}
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"
    return headers


def _file_data(uploaded: Any, name: str, host: str, mime: str, size: int) -> Dict[str, Any]:
    if isinstance(uploaded, dict) and uploaded.get("path"):
        payload = dict(uploaded)
        path = str(payload.get("path") or "")
    else:
        path = uploaded[0] if isinstance(uploaded, list) and uploaded else uploaded
        path = str(path)
        payload = {"path": path}
    payload["orig_name"] = name
    payload["mime_type"] = mime
    payload["size"] = size
    payload["is_stream"] = False
    payload["meta"] = {"_type": "gradio.FileData"}
    if path and not payload.get("url"):
        payload["url"] = f"{host}/gradio_api/file={path}"
    return payload


def _gradio5_upload(host: str, path: str) -> Dict[str, Any]:
    """Upload a local file to a Gradio 5 Space. Never logs the token."""
    import requests

    name = os.path.basename(path)
    mime = "image/png" if name.lower().endswith(".png") else "image/jpeg"
    with open(path, "rb") as fh:
        response = requests.post(
            f"{host}/gradio_api/upload",
            headers=_gradio_auth_headers(),
            files={"files": (name, fh, mime)},
            timeout=60,
        )
    if response.status_code >= 400:
        raise RuntimeError(f"CatVTON Space upload HTTP {response.status_code}")
    return _file_data(response.json(), name, host, mime, os.path.getsize(path))


def _gradio5_download(host: str, payload: Any) -> str:
    """Download the first image from a Gradio 5 result to a temp PNG path."""
    import requests

    item = payload[0] if isinstance(payload, (list, tuple)) else payload
    if isinstance(item, str) and os.path.exists(item):
        return item
    if not isinstance(item, dict):
        raise RuntimeError("CatVTON Space returned no image file.")
    url = item.get("url") or ""
    path = item.get("path") or ""
    if url.startswith("/"):
        url = f"{host}{url}"
    if not url and path:
        url = f"{host}/gradio_api/file={path}"
    if not url:
        raise RuntimeError("CatVTON Space returned an empty file reference.")
    response = requests.get(url, headers=_gradio_auth_headers(), timeout=60)
    if response.status_code >= 400 or not response.content:
        raise RuntimeError(f"CatVTON Space file HTTP {response.status_code}")
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    tmp.write(response.content)
    tmp.close()
    return tmp.name


_gradio5_fn_cache: Dict[str, Dict[str, int]] = {}


def _gradio5_fn_index(host: str, api_name: str) -> int:
    import requests

    name = api_name.lstrip("/")
    cached = _gradio5_fn_cache.get(host)
    if cached is None:
        cfg = requests.get(f"{host}/config", headers=_gradio_auth_headers(), timeout=20)
        if cfg.status_code >= 400:
            raise RuntimeError(f"CatVTON Space config HTTP {cfg.status_code}")
        cached = {}
        for index, dep in enumerate((cfg.json() or {}).get("dependencies") or []):
            api = str(dep.get("api_name") or "").lstrip("/")
            if api:
                cached[api] = index
        _gradio5_fn_cache[host] = cached
    if name not in cached:
        raise RuntimeError(f"CatVTON Space has no endpoint /{name}")
    return cached[name]


def _gradio5_predict(host: str, api_name: str, data: list, timeout: float) -> Any:
    """Queue a Gradio 5 Space job. /gradio_api/call returns a bare error on this Space."""
    import json
    import uuid
    import requests

    name = api_name.lstrip("/")
    session = uuid.uuid4().hex
    started = requests.post(
        f"{host}/gradio_api/queue/join",
        headers={**_gradio_auth_headers(), "Content-Type": "application/json"},
        json={
            "data": data,
            "fn_index": _gradio5_fn_index(host, name),
            "api_name": f"/{name}",
            "session_hash": session,
        },
        timeout=30,
    )
    if started.status_code >= 400:
        raise RuntimeError(f"CatVTON Space queue HTTP {started.status_code}: {started.text[:180]}")
    event_id = (started.json() or {}).get("event_id")
    if not event_id:
        raise RuntimeError("CatVTON Space returned no event_id.")

    deadline = time.time() + timeout
    with requests.get(
        f"{host}/gradio_api/queue/data",
        params={"session_hash": session},
        headers=_gradio_auth_headers(),
        stream=True,
        timeout=timeout + 5,
    ) as stream:
        if stream.status_code >= 400:
            raise RuntimeError(f"CatVTON Space stream HTTP {stream.status_code}")
        for raw in stream.iter_lines(decode_unicode=True):
            if time.time() > deadline:
                raise TimeoutError(f"CatVTON Space did not return within {int(timeout)}s")
            if not raw:
                continue
            line = raw.strip()
            if not line.startswith("data:"):
                continue
            payload_text = line.split(":", 1)[1].strip()
            if payload_text in ("", "null"):
                continue
            try:
                payload = json.loads(payload_text)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"CatVTON Space sent non-JSON: {payload_text[:160]}") from exc
            if not isinstance(payload, dict):
                continue
            msg = str(payload.get("msg") or "")
            if msg in ("estimation", "process_starts", "process_generating", "heartbeat"):
                continue
            if msg in ("process_completed", "complete"):
                if payload.get("success") is False:
                    output = payload.get("output") or {}
                    err = output.get("error") if isinstance(output, dict) else output
                    raise RuntimeError(f"CatVTON Space failed: {_safe_exc(str(err or payload.get('title') or payload))}")
                output = payload.get("output") or {}
                return output.get("data") if isinstance(output, dict) else output
            if msg in ("error", "process_failed", "unexpected_error"):
                raise RuntimeError(f"CatVTON Space error: {_safe_exc(str(payload))}")
            if msg == "close_stream":
                break
    raise TimeoutError(f"CatVTON Space stream ended without a result ({int(timeout)}s)")


def _provider_huggingface(
    person: Image.Image, garment: Image.Image, options: Dict[str, Any]
) -> TryOnResult:
    """Free generative try-on through a public Hugging Face Space (IDM-VTON).

    Same model family as the Replicate path and genuinely generative — the
    Space returns a re-rendered person, not a composite. It costs nothing and
    needs no card, but it runs on a *shared* ZeroGPU queue: the Space can be
    asleep, busy, or out of quota. Each of those is reported as its own status
    rather than collapsed into a generic failure, so the kiosk can tell a
    transient queue problem from a real misconfiguration.
    """
    global _hf_quota_until
    try:
        from gradio_client import handle_file  # noqa: F401
    except ImportError:
        return TryOnResult(
            ok=False,
            status="missing_dependency",
            provider="huggingface",
            message=(
                "Free try-on needs the gradio_client package, which is not "
                "installed in the AI service environment."
            ),
        )

    category = str(options.get("category") or "upper_body")
    if time.time() < _hf_quota_until:
        remaining = int(_hf_quota_until - time.time())
        return TryOnResult(
            ok=False,
            status="quota_exhausted",
            provider="huggingface",
            message=(
                "The free IDM-VTON GPU quota is exhausted. "
                f"Hugging Face says try again in {_wait_phrase(remaining)}."
            ),
            diagnostics={"cooldown_s": remaining},
        )

    fitted = _fit_portrait(
        person.convert("RGB"),
        (768, 1024),
        mode=_portrait_fit_mode(person, str(options.get("view") or "half")),
    )
    person_path = _to_temp_upload(fitted, portrait=False)
    garment_path = _to_temp_upload(garment)
    mask_img = _person_replace_mask(fitted, category)
    mask_path = _to_temp_png(mask_img) if mask_img is not None else None

    output = None
    used_space = ""
    attempts: list = []
    started = time.time()
    _tryon_log(
        "hf_request",
        space=HF_VTON_SPACES[0] if HF_VTON_SPACES else None,
        authenticated=bool(HF_TOKEN),
        steps=TRYON_STEPS,
        person=f"{fitted.size[0]}x{fitted.size[1]}",
        garment=f"{garment.size[0]}x{garment.size[1]}",
        category=category,
        textile=options.get("textile_name") or None,
        color=options.get("fabric_hex") or None,
        description=(options.get("garment_description") or "")[:80],
    )
    try:
        for space in HF_VTON_SPACES:
            for attempt in range(HF_VTON_ATTEMPTS):
                try:
                    from gradio_client import handle_file

                    client = _hf_client(space)
                    use_auto = mask_path is None or attempt > 0
                    human = {
                        "background": handle_file(person_path),
                        "layers": [] if use_auto else [handle_file(mask_path)],
                        "composite": None,
                    }
                    output = _predict_with_timeout(
                        client,
                        human,
                        handle_file(garment_path),
                        _garment_prompt(
                            options.get("garment_description", "garment"),
                            category,
                            options.get("textile_name", ""),
                        ),
                        use_auto,
                        False,
                        TRYON_STEPS,
                        42,
                        timeout=HF_VTON_TIMEOUT,
                        api_name="/tryon",
                    )
                    used_space = space
                    break
                except Exception as exc:  # noqa: BLE001
                    attempts.append(f"{space} (try {attempt + 1}): {_safe_exc(exc)}")
                    _drop_hf_client(space)
                    lowered = str(exc).lower()
                    if "quota" in lowered or "gpu task aborted" in lowered or "429" in lowered:
                        wait = _quota_wait_s(str(exc))
                        _hf_quota_until = time.time() + (wait if wait and wait > 0 else 180)
                        break
                    if attempt + 1 < HF_VTON_ATTEMPTS:
                        time.sleep(HF_VTON_BACKOFF * (attempt + 1))
            if output is not None:
                break
    finally:
        for path in (person_path, garment_path, mask_path):
            if not path:
                continue
            try:
                os.unlink(path)
            except OSError:
                pass

    if output is None:
        joined = " | ".join(attempts) or "no attempts recorded"
        lowered = joined.lower()
        status = "generation_failed"
        if "429" in lowered or "could not fetch config" in lowered or "rate" in lowered:
            status = "space_rate_limited"
        elif "quota" in lowered or "gpu task aborted" in lowered:
            status = "quota_exhausted"
        elif "timed out" in lowered or "timeout" in lowered:
            status = "space_busy"
        elif "sleep" in lowered or "starting" in lowered or "building" in lowered:
            status = "space_unavailable"
        elif "401" in lowered or "403" in lowered or "unauthorized" in lowered:
            status = "auth_failed"
        elif "minimum value" in lowered or "less than minimum" in lowered:
            status = "invalid_params"
        _tryon_log("hf_failed", status=status, elapsed_s=round(time.time() - started, 1), attempts=attempts)
        messages = {
            "space_rate_limited": (
                "The free IDM-VTON service is rate-limiting this network. "
                "Add a free Hugging Face token as HF_TOKEN in ai-service/.env "
                "(https://huggingface.co/settings/tokens) and restart the AI service. "
                "No paid credits are required."
            ),
            "space_busy": "The free try-on service is busy right now. Please tap Retry.",
            "quota_exhausted": _quota_message(attempts),
            "space_unavailable": "The free try-on service is starting up. Please tap Retry.",
            "auth_failed": (
                "The Hugging Face token was rejected. Check HF_TOKEN in "
                "ai-service/.env and restart the AI service."
            ),
            "invalid_params": (
                "IDM-VTON rejected the request parameters. "
                + (attempts[-1] if attempts else "Please tap Retry.")
            ),
        }
        fallback = (
            "IDM-VTON did not return an image. "
            + (attempts[-1] if attempts else "Please tap Retry.")
        )
        return TryOnResult(
            ok=False,
            status=status,
            provider="huggingface",
            message=messages.get(status, fallback),
            diagnostics={
                "spaces_tried": HF_VTON_SPACES,
                "authenticated": bool(HF_TOKEN),
                "steps": TRYON_STEPS,
                "attempts": attempts,
                "elapsed_s": round(time.time() - started, 1),
            },
        )

    # The Space returns (try-on image, masked debug image); we only want the first.
    result_path = output[0] if isinstance(output, (list, tuple)) else output
    if not result_path or not os.path.exists(str(result_path)):
        return TryOnResult(
            ok=False,
            status="generation_failed",
            provider="huggingface",
            message="The try-on Space returned no image.",
            diagnostics={"space": used_space},
        )

    encoded = ""
    out_size = (0, 0)
    try:
        with open(result_path, "rb") as fh:
            raw = fh.read()
        encoded = base64.b64encode(raw).decode("ascii")
        with Image.open(io.BytesIO(raw)) as probe:
            out_size = probe.size
    finally:
        try:
            os.unlink(result_path)
        except OSError:
            pass

    _tryon_log(
        "hf_ok",
        space=used_space,
        elapsed_s=round(time.time() - started, 1),
        output=f"{out_size[0]}x{out_size[1]}",
        authenticated=bool(HF_TOKEN),
    )
    return TryOnResult(
        ok=True,
        image_data_url=f"data:image/png;base64,{encoded}",
        status="generated",
        provider="huggingface",
        diagnostics={
            "space": used_space,
            "authenticated": bool(HF_TOKEN),
            "retries": len(attempts),
            "steps": TRYON_STEPS,
            "elapsed_s": round(time.time() - started, 1),
            "output_size": list(out_size),
        },
    )


def _provider_local_server(
    person: Image.Image, garment: Image.Image, options: Dict[str, Any]
) -> TryOnResult:
    """Self-hosted IDM-VTON running on our own GPU machine.

    No API token, no billing, no public queue — the weights and the GPU are
    ours. The kiosk Mac has no CUDA device and only 16 GB of unified memory,
    so inference lives on a separate box (or any host set in VTON_LOCAL_URL)
    and we POST to it over the LAN. Contract is deliberately the same shape as
    our own /tryon so the server is easy to implement and easy to swap.
    """
    import requests

    person_path = _to_temp_upload(person, portrait=True, view=str(options.get("view") or "half"))
    garment_path = _to_temp_upload(garment)
    try:
        with open(person_path, "rb") as pf, open(garment_path, "rb") as gf:
            person_b64 = base64.b64encode(pf.read()).decode("ascii")
            garment_b64 = base64.b64encode(gf.read()).decode("ascii")

        response = requests.post(
            f"{VTON_LOCAL_URL}/tryon",
            json={
                "person_image": f"data:image/jpeg;base64,{person_b64}",
                "garment_image": f"data:image/jpeg;base64,{garment_b64}",
                "garment_description": _garment_prompt(
                    options.get("garment_description", "garment"),
                    options.get("category", "upper_body"),
                    options.get("textile_name", ""),
                ),
                "category": options.get("category", "upper_body"),
                "steps": TRYON_STEPS,
                "seed": 42,
            },
            timeout=VTON_LOCAL_TIMEOUT,
        )
    except requests.exceptions.ConnectionError:
        return TryOnResult(
            ok=False,
            status="local_server_unreachable",
            provider="local_server",
            message=(
                f"No try-on server is answering at {VTON_LOCAL_URL}. "
                "Start the GPU inference server, or set VTON_LOCAL_URL to its address."
            ),
            diagnostics={"url": VTON_LOCAL_URL},
        )
    except requests.exceptions.Timeout:
        return TryOnResult(
            ok=False,
            status="local_server_timeout",
            provider="local_server",
            message="The try-on server did not respond in time. Please tap Try Again.",
            diagnostics={"url": VTON_LOCAL_URL, "timeout_s": VTON_LOCAL_TIMEOUT},
        )
    except Exception as exc:  # noqa: BLE001
        return TryOnResult(
            ok=False,
            status="generation_failed",
            provider="local_server",
            message=f"Try-on server call failed: {exc}",
            diagnostics={"url": VTON_LOCAL_URL},
        )
    finally:
        for path in (person_path, garment_path):
            try:
                os.unlink(path)
            except OSError:
                pass

    if response.status_code != 200:
        return TryOnResult(
            ok=False,
            status="generation_failed",
            provider="local_server",
            message=f"Try-on server returned HTTP {response.status_code}.",
            diagnostics={"url": VTON_LOCAL_URL, "body": response.text[:300]},
        )

    try:
        payload = response.json()
    except ValueError:
        return TryOnResult(
            ok=False,
            status="generation_failed",
            provider="local_server",
            message="The try-on server returned a non-JSON response.",
            diagnostics={"url": VTON_LOCAL_URL, "body": response.text[:300]},
        )

    image = payload.get("image") or payload.get("image_data_url")
    if not image:
        return TryOnResult(
            ok=False,
            status="generation_failed",
            provider="local_server",
            message=payload.get("message") or "The try-on server returned no image.",
            diagnostics={"url": VTON_LOCAL_URL},
        )

    if not str(image).startswith("data:"):
        image = f"data:image/png;base64,{image}"

    return TryOnResult(
        ok=True,
        image_data_url=image,
        status="generated",
        provider="local_server",
        diagnostics={"url": VTON_LOCAL_URL},
    )


def _provider_replicate(person: Image.Image, garment: Image.Image, options: Dict[str, Any]) -> TryOnResult:
    """Hosted IDM-VTON. Off by default — requires a funded Replicate account."""
    if not REPLICATE_API_TOKEN:
        return TryOnResult(
            ok=False,
            status="model_not_configured",
            provider="replicate",
            message="Replicate provider selected but REPLICATE_API_TOKEN is not set.",
        )
    try:
        import replicate
        import requests

        person_path = _to_temp_png(person)
        garment_path = _to_temp_png(garment)
        client = replicate.Client(api_token=REPLICATE_API_TOKEN)
        with open(garment_path, "rb") as garm_f, open(person_path, "rb") as human_f:
            output = client.run(
                TRYON_MODEL,
                input={
                    "crop": False,
                    "seed": 42,
                    "steps": TRYON_STEPS,
                    "category": options.get("category", "upper_body"),
                    "force_dc": False,
                    "garm_img": garm_f,
                    "human_img": human_f,
                    "garment_des": options.get("garment_description", "garment"),
                },
            )
        if hasattr(output, "read"):
            image_bytes = output.read()
        else:
            url = output[0] if isinstance(output, list) else str(output)
            image_bytes = requests.get(url, timeout=60).content

        encoded = base64.b64encode(image_bytes).decode("ascii")
        return TryOnResult(
            ok=True,
            image_data_url=f"data:image/png;base64,{encoded}",
            status="generated",
            provider="replicate",
        )
    except Exception as exc:  # noqa: BLE001
        return TryOnResult(
            ok=False,
            status="generation_failed",
            provider="replicate",
            message=f"Try-on generation failed: {exc}",
        )


def _cloth_type(category: str) -> str:
    if category == "lower_body":
        return "lower"
    if category == "dresses":
        return "overall"
    return "upper"


def _transient_failure(status: str) -> bool:
    return status in {
        "quota_exhausted",
        "space_rate_limited",
        "space_busy",
        "space_unavailable",
        "local_server_unreachable",
        "local_server_timeout",
        "generation_failed",
        "auth_failed",
    }


def _provider_catvton_hf(
    person: Image.Image, garment: Image.Image, options: Dict[str, Any]
) -> TryOnResult:
    """CatVTON via the official Hugging Face ZeroGPU Space.

    Same ZeroGPU quota pool as IDM-VTON. Kept as a swappable provider, not as
    a way around an exhausted IDM-VTON quota.
    """
    global _hf_quota_until
    if time.time() < _hf_quota_until:
        remaining = int(_hf_quota_until - time.time())
        return TryOnResult(
            ok=False,
            status="quota_exhausted",
            provider="catvton_hf",
            message=(
                "The free ZeroGPU quota is exhausted (shared with IDM-VTON). "
                f"Hugging Face says try again in {_wait_phrase(remaining)}."
            ),
            diagnostics={"cooldown_s": remaining, "space": CATVTON_SPACE},
        )

    category = str(options.get("category") or "upper_body")
    fitted = _fit_portrait(
        person.convert("RGB"),
        (768, 1024),
        mode=_portrait_fit_mode(person, str(options.get("view") or "half")),
    )
    person_path = _to_temp_upload(fitted, portrait=False)
    garment_path = _to_temp_upload(garment)
    mask_img = _person_replace_mask(fitted, category)
    # Space reads layers[0] and crashes if the list is empty. Upload JPEG only:
    # a PNG layer makes Gradio 5 try to write RGBA as JPEG.
    layer = mask_img.convert("L") if mask_img is not None else Image.new("L", fitted.size, 0)
    mask_path = _to_temp_upload(layer.convert("RGB"))
    started = time.time()
    output = None
    attempts: list = []
    host = _space_host(CATVTON_SPACE)
    _tryon_log(
        "catvton_hf_request",
        space=CATVTON_SPACE,
        host=host,
        authenticated=bool(HF_TOKEN),
        person=f"{fitted.size[0]}x{fitted.size[1]}",
        garment=f"{garment.size[0]}x{garment.size[1]}",
        cloth_type=_cloth_type(category),
    )
    try:
        person_file = _gradio5_upload(host, person_path)
        garment_file = _gradio5_upload(host, garment_path)
        mask_file = _gradio5_upload(host, mask_path)
        # ImageEditor on Gradio 5.49 rejects a hand-built editor (RGBA/JPEG).
        # person_example_fn returns the same structure the web UI uses.
        editor = _gradio5_predict(host, "/person_example_fn", [person_file], timeout=40)
        human = editor[0] if isinstance(editor, list) else editor
        if not isinstance(human, dict):
            raise RuntimeError("CatVTON Space did not return a person editor.")
        # Do not inject our own layer: Gradio 5.49 ImageEditor then writes RGBA as JPEG.
        raw = _gradio5_predict(
            host,
            "/submit_function",
            [
                human,
                garment_file,
                _cloth_type(category),
                CATVTON_STEPS,
                CATVTON_GUIDANCE,
                42,
                "result only",
            ],
            timeout=max(HF_VTON_TIMEOUT, 150),
        )
        output = _gradio5_download(host, raw)
    except Exception as exc:  # noqa: BLE001
        attempts.append(_safe_exc(exc))
        lowered = str(exc).lower()
        if "quota" in lowered or "gpu task aborted" in lowered or "429" in lowered:
            wait = _quota_wait_s(str(exc))
            _hf_quota_until = time.time() + (wait if wait and wait > 0 else 180)
    finally:
        for path in (person_path, garment_path, mask_path):
            if not path:
                continue
            try:
                os.unlink(path)
            except OSError:
                pass

    if output is None:
        joined = " | ".join(attempts) or "no attempts recorded"
        lowered = joined.lower()
        status = "generation_failed"
        if "quota" in lowered or "gpu task aborted" in lowered:
            status = "quota_exhausted"
        elif "429" in lowered or "rate" in lowered:
            status = "space_rate_limited"
        elif "timed out" in lowered or "timeout" in lowered:
            status = "space_busy"
        elif "401" in lowered or "403" in lowered or "unauthorized" in lowered:
            status = "auth_failed"
        _tryon_log("catvton_hf_failed", status=status, attempts=attempts)
        message = {
            "quota_exhausted": (
                "CatVTON on Hugging Face ZeroGPU is quota-exhausted "
                "(same GPU pool as IDM-VTON). Use a separate CatVTON GPU server."
            ),
            "space_rate_limited": "The CatVTON Hugging Face Space is rate-limiting this network.",
            "space_busy": "The CatVTON Hugging Face Space timed out. Please tap Retry.",
            "auth_failed": "The Hugging Face token was rejected for CatVTON.",
        }.get(status, "CatVTON (Hugging Face) did not return an image. " + (attempts[-1] if attempts else ""))
        return TryOnResult(
            ok=False,
            status=status,
            provider="catvton_hf",
            message=message,
            diagnostics={
                "space": CATVTON_SPACE,
                "authenticated": bool(HF_TOKEN),
                "attempts": attempts,
                "elapsed_s": round(time.time() - started, 1),
            },
        )

    result_path = output[0] if isinstance(output, (list, tuple)) else output
    if not result_path or not os.path.exists(str(result_path)):
        return TryOnResult(
            ok=False,
            status="generation_failed",
            provider="catvton_hf",
            message="The CatVTON Space returned no image.",
            diagnostics={"space": CATVTON_SPACE},
        )
    encoded = ""
    out_size = (0, 0)
    try:
        with open(result_path, "rb") as fh:
            raw = fh.read()
        encoded = base64.b64encode(raw).decode("ascii")
        with Image.open(io.BytesIO(raw)) as probe:
            out_size = probe.size
    finally:
        try:
            os.unlink(result_path)
        except OSError:
            pass
    _tryon_log("catvton_hf_ok", elapsed_s=round(time.time() - started, 1), output=f"{out_size[0]}x{out_size[1]}")
    return TryOnResult(
        ok=True,
        image_data_url=f"data:image/png;base64,{encoded}",
        status="generated",
        provider="catvton_hf",
        diagnostics={
            "space": CATVTON_SPACE,
            "authenticated": bool(HF_TOKEN),
            "elapsed_s": round(time.time() - started, 1),
            "output_size": list(out_size),
            "model": "CatVTON",
        },
    )


def _provider_catvton(
    person: Image.Image, garment: Image.Image, options: Dict[str, Any]
) -> TryOnResult:
    """CatVTON on a separate NVIDIA GPU server (POST /generate)."""
    import requests

    category = str(options.get("category") or "upper_body")
    fitted = _fit_portrait(
        person.convert("RGB"),
        (768, 1024),
        mode=_portrait_fit_mode(person, str(options.get("view") or "half")),
    )
    mask_img = _person_replace_mask(fitted, category)
    person_path = _to_temp_upload(fitted, portrait=False)
    garment_path = _to_temp_upload(garment)
    mask_path = _to_temp_png(mask_img) if mask_img is not None else None
    started = time.time()
    try:
        with open(person_path, "rb") as pf, open(garment_path, "rb") as gf:
            person_b64 = base64.b64encode(pf.read()).decode("ascii")
            garment_b64 = base64.b64encode(gf.read()).decode("ascii")
        mask_b64 = None
        if mask_path:
            with open(mask_path, "rb") as mf:
                mask_b64 = base64.b64encode(mf.read()).decode("ascii")
        payload = {
            "person_image": f"data:image/jpeg;base64,{person_b64}",
            "garment_image": f"data:image/jpeg;base64,{garment_b64}",
            "garment_mask": f"data:image/png;base64,{mask_b64}" if mask_b64 else None,
            "category": category,
            "cloth_type": _cloth_type(category),
            "textile": options.get("textile_name") or None,
            "color": options.get("fabric_hex") or None,
            "steps": CATVTON_STEPS,
            "guidance": CATVTON_GUIDANCE,
            "seed": 42,
        }
        _tryon_log(
            "catvton_request",
            url=VTON_LOCAL_URL,
            person=f"{fitted.size[0]}x{fitted.size[1]}",
            garment=f"{garment.size[0]}x{garment.size[1]}",
            cloth_type=payload["cloth_type"],
            has_mask=bool(mask_b64),
        )
        response = requests.post(
            f"{VTON_LOCAL_URL}/generate",
            json=payload,
            timeout=VTON_LOCAL_TIMEOUT,
        )
    except requests.exceptions.ConnectionError:
        return TryOnResult(
            ok=False,
            status="local_server_unreachable",
            provider="catvton",
            message=(
                f"No CatVTON GPU server is answering at {VTON_LOCAL_URL}. "
                "Start the GPU server (see ai-service/local_vton_server/) or set VTON_LOCAL_URL."
            ),
            diagnostics={"url": VTON_LOCAL_URL},
        )
    except requests.exceptions.Timeout:
        return TryOnResult(
            ok=False,
            status="local_server_timeout",
            provider="catvton",
            message="The CatVTON GPU server did not respond in time. Please tap Try Again.",
            diagnostics={"url": VTON_LOCAL_URL, "timeout_s": VTON_LOCAL_TIMEOUT},
        )
    except Exception as exc:  # noqa: BLE001
        return TryOnResult(
            ok=False,
            status="generation_failed",
            provider="catvton",
            message=f"CatVTON GPU server call failed: {_safe_exc(exc)}",
            diagnostics={"url": VTON_LOCAL_URL},
        )
    finally:
        for path in (person_path, garment_path, mask_path):
            if not path:
                continue
            try:
                os.unlink(path)
            except OSError:
                pass

    if response.status_code != 200:
        body = response.text[:400]
        lowered = body.lower()
        status = "generation_failed"
        if "quota" in lowered:
            status = "quota_exhausted"
        return TryOnResult(
            ok=False,
            status=status,
            provider="catvton",
            message=f"CatVTON GPU server returned HTTP {response.status_code}.",
            diagnostics={"url": VTON_LOCAL_URL, "body": body, "elapsed_s": round(time.time() - started, 1)},
        )
    try:
        data = response.json()
    except ValueError:
        return TryOnResult(
            ok=False,
            status="generation_failed",
            provider="catvton",
            message="The CatVTON GPU server returned a non-JSON response.",
            diagnostics={"url": VTON_LOCAL_URL, "body": response.text[:300]},
        )
    if not data.get("ok"):
        return TryOnResult(
            ok=False,
            status=str(data.get("status") or "generation_failed"),
            provider="catvton",
            message=data.get("message") or "CatVTON GPU server returned no image.",
            diagnostics={"url": VTON_LOCAL_URL, **(data.get("diagnostics") or {})},
        )
    image = data.get("image") or data.get("generated_image") or data.get("image_data_url")
    if not image:
        return TryOnResult(
            ok=False,
            status="generation_failed",
            provider="catvton",
            message=data.get("message") or "CatVTON GPU server returned no image.",
            diagnostics={"url": VTON_LOCAL_URL},
        )
    if not str(image).startswith("data:"):
        image = f"data:image/png;base64,{image}"
    _tryon_log("catvton_ok", elapsed_s=round(time.time() - started, 1), url=VTON_LOCAL_URL)
    return TryOnResult(
        ok=True,
        image_data_url=image,
        status="generated",
        provider="catvton",
        diagnostics={
            "url": VTON_LOCAL_URL,
            "model": "CatVTON",
            "elapsed_s": round(time.time() - started, 1),
            "output_size": data.get("output_size"),
        },
    )


def _provider_mock(*_args, **_kwargs) -> TryOnResult:
    if not VTON_ALLOW_MOCK:
        return TryOnResult(
            ok=False,
            status="mock_disabled",
            provider="mock",
            message="Mock try-on is disabled. It never returns a fashion image in kiosk mode.",
        )
    return TryOnResult(
        ok=False,
        status="mock_disabled",
        provider="mock",
        message="Mock try-on is not allowed to return a generated fashion image.",
    )


_PROVIDERS = {
    "none": _provider_none,
    "huggingface": _provider_huggingface,
    "hf": _provider_huggingface,
    "catvton_hf": _provider_catvton_hf,
    "catvton": _provider_catvton,
    "local_server": _provider_local_server,
    "local": _provider_local,
    "mock": _provider_mock,
    "replicate": _provider_replicate,
}


def virtual_tryon(
    user_image: str,
    garment_image: str,
    options: Optional[Dict[str, Any]] = None,
) -> TryOnResult:
    """Generate the user wearing the garment, via the configured provider."""
    options = options or {}
    primary = VTON_PROVIDER
    provider_fn = _PROVIDERS.get(primary, _provider_none)

    if primary == "none":
        return _provider_none()

    try:
        person = _decode(user_image).convert("RGB")
        garment, cloth_mask = prepare_garment(_decode(garment_image))
        fabric_hex = str(options.get("fabric_hex") or "").strip()
        textile_image = str(options.get("textile_image") or "").strip()
        if textile_image:
            garment = apply_textile(garment, _decode(textile_image), cloth_mask)
            if fabric_hex:
                garment = tint_pattern(garment, fabric_hex, mask=cloth_mask)
        elif fabric_hex:
            garment = recolor_garment(garment, fabric_hex, cloth_mask)
        person_err = _validate_person(person)
        garment_err = _validate_garment(garment, cloth_mask)
        if person_err or garment_err:
            return TryOnResult(
                ok=False,
                status="bad_input",
                message=person_err or garment_err or "Invalid try-on inputs.",
            )
        options = {**options, "_cloth_mask": cloth_mask}
    except Exception as exc:  # noqa: BLE001
        return TryOnResult(
            ok=False,
            status="bad_input",
            message=f"Could not read the supplied images: {exc}",
        )

    _tryon_log(
        "request",
        person=f"{person.size[0]}x{person.size[1]}",
        garment=f"{garment.size[0]}x{garment.size[1]}",
        textile=options.get("textile_name") or None,
        color=fabric_hex or None,
        category=options.get("category") or None,
        description=(options.get("garment_description") or "")[:80],
        provider=primary,
        fallback=_effective_fallback() or None,
        space=HF_VTON_SPACE if primary in ("huggingface", "hf") else (CATVTON_SPACE if primary == "catvton_hf" else None),
        authenticated=bool(HF_TOKEN) if primary in ("huggingface", "hf", "catvton_hf") else False,
        steps=TRYON_STEPS,
    )

    result = provider_fn(person, garment, options)
    fallback = _effective_fallback()
    if (
        not result.ok
        and fallback
        and fallback != primary
        and fallback in _PROVIDERS
        and _transient_failure(result.status)
    ):
        _tryon_log(
            "fallback",
            from_provider=primary,
            to_provider=fallback,
            configured_fallback=VTON_FALLBACK or None,
            primary_status=result.status,
        )
        fallback_fn = _PROVIDERS[fallback]
        fallback_result = fallback_fn(person, garment, options)
        fallback_result.diagnostics = {
            **(fallback_result.diagnostics or {}),
            "primary_provider": primary,
            "primary_status": result.status,
            "primary_message": (result.message or "")[:240],
            "fallback_provider": fallback,
            "configured_fallback": VTON_FALLBACK or None,
        }
        if fallback_result.ok:
            result = fallback_result
        else:
            result = TryOnResult(
                ok=False,
                status=fallback_result.status or result.status,
                provider=f"{primary}+{fallback}",
                message=(
                    f"{primary}: {result.message} "
                    f"Fallback {fallback}: {fallback_result.message}"
                ),
                diagnostics={
                    "primary": result.diagnostics,
                    "fallback": fallback_result.diagnostics,
                },
            )
    _tryon_log(
        "provider_done",
        ok=result.ok,
        status=result.status,
        has_image=bool(result.image_data_url),
        message=(result.message or "")[:200],
    )
    if result.ok and result.image_data_url:
        try:
            generated = _decode(result.image_data_url).convert("RGB")
            fitted = _fit_portrait(
                person.convert("RGB"),
                (768, 1024),
                mode=_portrait_fit_mode(person, str(options.get("view") or "half")),
            )
            preserved, ident = preserve_identity(fitted, generated)
            generated = preserved
            result.image_data_url = _encode_data_url(generated)
            mae = _torso_mae(fitted, generated)
            reason = _validate_result(fitted, generated)
            if mae < 4.0:
                reason = reason or "The try-on output matches the original person photo too closely."
            result.diagnostics = {
                **(result.diagnostics or {}),
                "torso_mae": round(mae, 2),
                "clothing_changed": mae >= 4.0,
                "output_size": list(generated.size),
                "cream_letterbox": _letterbox_artifact(generated),
                "pipeline": [
                    "capture",
                    "garment_prep",
                    result.provider or primary,
                    "identity_preserve",
                ],
                **ident,
            }
            if reason:
                result.diagnostics["reason"] = reason
                _tryon_log("invalid_result", reason=reason, torso_mae=round(mae, 2), size=list(generated.size))
                return TryOnResult(
                    ok=False,
                    status="invalid_result",
                    provider=result.provider,
                    message=reason,
                    diagnostics=result.diagnostics,
                )
            _tryon_log(
                "generated",
                torso_mae=round(mae, 2),
                clothing_changed=True,
                output=f"{generated.size[0]}x{generated.size[1]}",
            )
        except Exception as exc:  # noqa: BLE001
            result.diagnostics = {
                **(result.diagnostics or {}),
                "similarity_check_error": str(exc),
            }

    used = result.provider or primary
    caps = PROVIDER_CAPABILITIES.get(used, PROVIDER_CAPABILITIES.get(primary, PROVIDER_CAPABILITIES["none"]))
    unsupported = []
    if options.get("accessories") and not caps.get("accessories"):
        unsupported.append("accessories")
    if options.get("background_id") and not caps.get("background_generation"):
        unsupported.append("background")
    if options.get("lighting") and options.get("lighting") != "neutral" and not caps.get("lighting_control"):
        unsupported.append("lighting")
    result.diagnostics = {
        **(result.diagnostics or {}),
        "model": caps.get("model"),
        "provider": used,
        "configured_provider": primary,
        "fallback_provider": VTON_FALLBACK or None,
        "generated_by": (result.diagnostics or {}).get("generated_by")
        or ("diffusion_garment_transfer" if result.ok else None),
        "composited": bool((result.diagnostics or {}).get("composited")),
        "capabilities": caps,
        "unsupported_inputs": unsupported,
        "received": {
            "textile": options.get("textile_name") or None,
            "color": fabric_hex or None,
            "accessories": options.get("accessories") or [],
            "background_id": options.get("background_id") or None,
            "view": options.get("view") or None,
            "lighting": options.get("lighting") or None,
        },
    }
    return result
