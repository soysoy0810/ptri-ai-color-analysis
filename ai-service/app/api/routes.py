from __future__ import annotations

from fastapi import APIRouter

from ..core.palette import load_palette
from ..schemas.analyze import (
    AnalyzeRequest,
    AnalyzeResponse,
    SegmentRequest,
    SegmentResponse,
    TryOnRequest,
    TryOnResponse,
)
from ..services.color_analysis import analyze_image, decode_image
from ..services.segmentation import get_segmenter, mask_to_png_data_url, refine_person_mask
from ..services.tryon import probe_runtime, tryon_status, virtual_tryon

router = APIRouter()


@router.get("/health")
def health():
    return {"ok": True, "data": {"status": "ok", "service": "ptri-ai-color"}}


@router.get("/palette")
def palette():
    return {"ok": True, "data": {"palette": load_palette()}}


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    # Keep AI response body flat for backend AiClient compatibility,
    # while /health and /palette use the shared envelope.
    return analyze_image(req.image, req.session_id, req.images)


@router.post("/segment", response_model=SegmentResponse)
def segment(req: SegmentRequest):
    img = decode_image(req.image)
    segmenter = get_segmenter()
    if segmenter is None:
        return SegmentResponse(segmented=False, mask=None, width=0, height=0)

    mask = segmenter.segment(img)
    if mask is None:
        return SegmentResponse(segmented=False, mask=None, width=0, height=0)

    from numpy import array as np_array

    mask = refine_person_mask(mask, np_array(img.convert("RGB")))

    w, h = img.size
    return SegmentResponse(segmented=True, mask=mask_to_png_data_url(mask), width=w, height=h)


@router.get("/tryon/runtime")
def tryon_runtime():
    """What this machine can actually run — lets the kiosk say precisely why
    try-on is or isn't available instead of guessing."""
    return {"ok": True, "data": probe_runtime()}


@router.get("/tryon/status")
def tryon_provider_status():
    """Which VTON provider is configured and whether it can generate."""
    return {"ok": True, "data": tryon_status()}


@router.post("/tryon", response_model=TryOnResponse)
def tryon(req: TryOnRequest):
    """Generative virtual try-on via the configured provider.

    Never returns a substitute image: if no engine can generate, the
    response carries ok=False plus the specific technical reason.
    """
    result = virtual_tryon(
        user_image=req.person_image,
        garment_image=req.garment_image,
        options={
            "category": req.category,
            "garment_description": req.garment_description,
            "fabric_hex": req.fabric_hex,
            "textile_name": req.textile_name,
            "textile_image": req.textile_image,
            "accessories": req.accessories,
            "background_id": req.background_id,
            "view": req.view,
            "lighting": req.lighting,
        },
    )
    return TryOnResponse(
        ok=result.ok,
        image=result.image_data_url,
        status=result.status,
        message=result.message,
        provider=result.provider,
        diagnostics=result.diagnostics,
    )
