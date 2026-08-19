from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    image: str = Field(..., description="Base64 data URL or raw base64 JPEG/PNG")
    images: Optional[List[str]] = Field(
        None, description="Additional hold-still frames for multi-frame median analysis"
    )
    session_id: Optional[str] = None


class ColorScore(BaseModel):
    id: str
    name: str
    hex: str
    score: float
    delta_e: float
    # Per-factor breakdown so a recommendation can be explained, not just asserted.
    factors: Optional[Dict[str, float]] = None
    reason: Optional[str] = None


class FaceRegion(BaseModel):
    left: int
    top: int
    right: int
    bottom: int
    confidence: float
    provider: str


class RegionRgb(BaseModel):
    r: float
    g: float
    b: float


class AnalyzeResponse(BaseModel):
    session_id: Optional[str] = None
    face_detected: bool
    face_region: Optional[FaceRegion] = None
    lighting: Dict[str, Any]
    sample_rgb: Dict[str, float]
    skin_regions: Dict[str, RegionRgb] = Field(default_factory=dict)
    skin_profile: Optional[Dict[str, Any]] = None
    top20: List[ColorScore]
    model: Dict[str, Any]


class SegmentRequest(BaseModel):
    image: str = Field(..., description="Base64 data URL or raw base64 JPEG/PNG")


class SegmentResponse(BaseModel):
    segmented: bool
    mask: Optional[str] = Field(None, description="Grayscale alpha mask as a base64 PNG data URL")
    width: Optional[int] = None
    height: Optional[int] = None


class TryOnRequest(BaseModel):
    person_image: str = Field(..., description="Captured visitor photo, base64 data URL")
    garment_image: str = Field(..., description="Selected garment photo, base64 data URL")
    category: str = Field("upper_body", description="upper_body | lower_body | dresses")
    garment_description: str = "garment"
    fabric_hex: Optional[str] = Field(
        None, description="Optional fabric color applied to the garment reference before transfer"
    )
    textile_name: Optional[str] = None
    textile_image: Optional[str] = Field(None, description="Philippine textile photo, base64 data URL")
    accessories: List[str] = Field(default_factory=list)
    background_id: Optional[str] = None
    view: Optional[str] = None
    lighting: Optional[str] = None


class TryOnResponse(BaseModel):
    ok: bool
    image: Optional[str] = Field(None, description="Generated try-on image as a base64 data URL")
    status: str
    message: str = ""
    provider: str = "none"
    # Runtime facts (device, torch/cuda/mps availability) so an unavailable
    # try-on can state the precise technical reason.
    diagnostics: Dict[str, Any] = Field(default_factory=dict)
