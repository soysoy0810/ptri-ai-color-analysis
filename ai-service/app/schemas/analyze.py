from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    image: str = Field(..., description="Base64 data URL or raw base64 JPEG/PNG")
    session_id: Optional[str] = None


class ColorScore(BaseModel):
    id: str
    name: str
    hex: str
    score: float
    delta_e: float


class AnalyzeResponse(BaseModel):
    session_id: Optional[str] = None
    face_detected: bool
    lighting: Dict[str, Any]
    sample_rgb: Dict[str, float]
    top20: List[ColorScore]
    model: Dict[str, str]
