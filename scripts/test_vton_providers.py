#!/usr/bin/env python3
"""Provider-layer tests. Does not claim visual VTON success without an output file."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ai-service"))

from app.services.tryon import (  # noqa: E402
    VTON_FALLBACK,
    VTON_PROVIDER,
    _effective_fallback,
    _provider_catvton,
    _provider_local,
    _provider_mock,
    _torso_mae,
    normalize_provider,
    tryon_status,
)


def assert_true(cond: bool, msg: str) -> None:
    if not cond:
        raise SystemExit(f"FAIL: {msg}")
    print(f"PASS: {msg}")


def test_aliases() -> None:
    assert_true(normalize_provider("huggingface_idm_vton") == "huggingface", "huggingface_idm_vton alias")
    assert_true(normalize_provider("local") == "local", "local is on-Mac clothing fit")
    assert_true(normalize_provider("local_mac") == "local", "local_mac alias")
    assert_true(normalize_provider("huggingface_catvton") == "catvton_hf", "CatVTON HF alias")
    assert_true(normalize_provider("catvton") == "catvton", "catvton canonical")


def test_status_no_token() -> None:
    status = tryon_status()
    blob = str(status)
    assert_true("hf_" not in blob, "status must not contain an HF token prefix")
    assert_true("provider" in status and "available" in status, "status has provider + available")
    assert_true(status.get("full_body_from_face_only") is False, "status admits face-only ≠ full body")
    print("  status", {k: status.get(k) for k in ("provider", "available", "mode", "model", "reason", "fallback")})


def test_catvton_server_missing() -> None:
    person = Image.new("RGB", (400, 500), (180, 140, 120))
    garment = Image.new("RGB", (300, 400), (30, 60, 120))
    result = _provider_catvton(person, garment, {"category": "upper_body"})
    assert_true(not result.ok, "missing GPU server must not return ok")
    assert_true(result.image_data_url is None, "missing GPU server must not return an image")
    assert_true(result.status == "local_server_unreachable", f"got {result.status}")
    print("  catvton message:", result.message[:160])


def test_mock_disabled() -> None:
    result = _provider_mock()
    assert_true(not result.ok and result.image_data_url is None, "mock never returns a fashion image")


def test_fallback_never_zerogpu() -> None:
    effective = _effective_fallback()
    assert_true(
        effective not in ("huggingface", "hf", "catvton_hf"),
        f"local-first must not fall back to ZeroGPU, got {effective!r}",
    )
    print("  effective_fallback", effective)


def test_local_fit_changes_clothing() -> None:
    person = Image.open(ROOT / "frontend/public/models/template-female-studio.png").convert("RGB")
    garment = Image.open(ROOT / "frontend/public/garments/garment-lk4-dress.png").convert("RGB")
    result = _provider_local(person, garment, {"category": "dresses"})
    assert_true(result.ok and bool(result.image_data_url), "local provider returns an image")
    import base64
    import io

    raw = result.image_data_url.split(",", 1)[1]
    generated = Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")
    mae = _torso_mae(person, generated)
    assert_true(mae >= 4.0, f"local fit must change clothing, torso_mae={mae:.2f}")
    out = Path("/tmp/ptri-local-fit.png")
    generated.save(out)
    print("  saved", out, "torso_mae", round(mae, 2), "size", generated.size)


def main() -> None:
    print("configured_provider", VTON_PROVIDER)
    print("configured_fallback", VTON_FALLBACK or None)
    test_aliases()
    test_status_no_token()
    test_catvton_server_missing()
    test_mock_disabled()
    test_fallback_never_zerogpu()
    test_local_fit_changes_clothing()
    print("ALL PROVIDER TESTS PASSED")


if __name__ == "__main__":
    main()
