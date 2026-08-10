from __future__ import annotations

from fastapi import APIRouter

from ..core.palette import load_palette
from ..schemas.analyze import AnalyzeRequest, AnalyzeResponse
from ..services.color_analysis import analyze_image

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
    return analyze_image(req.image, req.session_id)
