#!/usr/bin/env python3
"""Pipeline checks for garment assets, dress silhouette, and person framing."""

from __future__ import annotations

from pathlib import Path
import sys

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ai-service"))

from app.services.tryon import (  # noqa: E402
    apply_textile,
    prepare_garment,
    _fit_portrait,
    _letterbox_artifact,
    _portrait_fit_mode,
    _validate_result,
)


def assert_true(cond: bool, msg: str) -> None:
    if not cond:
        raise SystemExit(f"FAIL: {msg}")
    print(f"PASS: {msg}")


def test_navy_dress_asset() -> None:
    path = ROOT / "frontend" / "public" / "garments" / "garment-lk4-dress.png"
    assert_true(path.exists(), "Navy midi dress isolated garment exists")
    im = Image.open(path)
    w, h = im.size
    assert_true(h / w > 1.6, f"Dress is a full silhouette not a blouse ({w}x{h})")
    rgb = np.array(im.convert("RGB"))
    cloth = ~np.all(rgb > 245, axis=2)
    lower = cloth[int(h * 0.55) :].mean()
    upper = cloth[: int(h * 0.35)].mean()
    assert_true(lower > 0.15, f"Dress has skirt cloth in the lower half ({lower:.3f})")
    assert_true(upper > 0.08, f"Dress has bodice/sleeves in the upper half ({upper:.3f})")


def test_prepare_dress_keeps_skirt() -> None:
    path = ROOT / "frontend" / "public" / "garments" / "garment-lk4-dress.png"
    garment, mask = prepare_garment(Image.open(path))
    m = np.array(mask.convert("L"))
    h = m.shape[0]
    lower = (m[int(h * 0.55) :] > 16).mean()
    assert_true(lower > 0.12, f"prepare_garment keeps the midi skirt ({lower:.3f})")
    textile = ROOT / "frontend" / "public" / "textiles" / "textile-tnalak.jpg"
    if textile.exists():
        patterned = apply_textile(garment, Image.open(textile), mask)
        pm = np.array(mask.convert("L")) > 16
        before = np.array(garment.convert("RGB"))
        after = np.array(patterned.convert("RGB"))
        outside = ~pm
        if outside.any():
            delta = np.abs(after[outside].astype(int) - before[outside].astype(int)).mean()
            assert_true(delta < 8, f"textile stays inside the garment mask (outside Δ={delta:.2f})")
        print("PASS: textile applied on dress mask")


def test_fit_portrait_modes() -> None:
    # Tall full-length capture: cover would crop the feet, contain must keep them.
    arr = np.full((1600, 600, 3), 240, dtype=np.uint8)
    arr[40:1560, 260:340] = (40, 40, 50)
    img = Image.fromarray(arr)
    cover = _fit_portrait(img, (768, 1024), mode="cover")
    contain = _fit_portrait(img, (768, 1024), mode="contain")
    cover_px = np.array(cover)
    contain_px = np.array(contain)
    contain_has_figure = (contain_px[:, :, 0] < 80).mean()
    assert_true(contain.size == (768, 1024), "contain mode is 768x1024")
    assert_true(contain_has_figure > 0.02, "contain mode keeps the full-length figure")
    assert_true(not np.array_equal(cover_px, contain_px), "full-body contain framing differs from half-body cover crop")
    edge_mean = contain_px[:, :12].mean(axis=(0, 1))
    assert_true(
        not (abs(float(edge_mean[0]) - 236) < 2 and abs(float(edge_mean[1]) - 232) < 2 and abs(float(edge_mean[2]) - 226) < 2),
        "contain pad is not the old cream letterbox color",
    )


def test_kiosk_capture_uses_cover() -> None:
    kiosk = Image.new("RGB", (800, 1000), (40, 40, 50))
    tall = Image.new("RGB", (600, 1600), (40, 40, 50))
    assert_true(_portrait_fit_mode(kiosk, "full") == "cover", "4:5 kiosk scan uses cover even in Full view")
    assert_true(_portrait_fit_mode(tall, "full") == "contain", "true full-length photo uses contain")
    assert_true(_portrait_fit_mode(kiosk, "half") == "cover", "half-body scan uses cover")


def test_gray_studio_is_not_rejected() -> None:
    arr = np.full((1024, 768, 3), 198, dtype=np.uint8)
    arr[60:240, 290:480] = np.random.randint(70, 190, (180, 190, 3), dtype=np.uint8)
    result = Image.fromarray(arr)
    assert_true(_validate_result(result, result) is None, "IDM-VTON gray studio output is accepted")
    cream = arr.copy()
    cream[:, :50] = (236, 232, 226)
    cream[:50, :] = (236, 232, 226)
    assert_true(_letterbox_artifact(Image.fromarray(cream)), "cream bars are still detected as a warning")
    assert_true(not _letterbox_artifact(result), "gray studio edges are not cream letterbox")


def test_frontend_wiring() -> None:
    vton = (ROOT / "frontend" / "src" / "data" / "garments.ts").read_text()
    preview = (ROOT / "frontend" / "src" / "features" / "preview" / "PreviewScreen.tsx").read_text()
    virtual = (ROOT / "frontend" / "src" / "shared" / "ui" / "VirtualTryOn.tsx").read_text()
    app = (ROOT / "frontend" / "src" / "app" / "App.tsx").read_text()
    session = (ROOT / "frontend" / "src" / "shared" / "hooks" / "useKioskSession.ts").read_text()
    assert_true("garment-lk4-dress.png" in vton, "LOOK_VTON.lk4 points at the midi dress PNG")
    vton_block = vton.split("LOOK_VTON")[1].split("DESIGN_GARMENT")[0]
    chunk = vton_block.split("lk2:")[1].split("lk3:")[0]
    assert_true("garment-lk4-dress.png" in chunk, "Beige shirt dress uses an isolated dress PNG")
    assert_true("look-beige-dress" not in chunk, "Beige shirt dress does not send the look-card photo")
    assert_true("accessoryItems={[]}" in preview, "Preview does not stamp accessories onto the try-on")
    assert_true("AI generation coming soon." in preview, "Accessories are marked coming soon")
    assert_true("console.info('[tryon] accessories:'" in virtual, "try-on logs accessory ids")
    assert_true("composeFaceFit" not in virtual, "Preview try-on does not use on-device face-fit collage")
    assert_true("onRetake" not in virtual, "Preview try-on does not offer a second scan")
    assert_true("Open body scan" not in virtual, "Preview does not open a body-scan camera")
    assert_true("Retake photo" not in virtual, "Preview does not ask to retake the person photo")
    assert_true("needs-full" not in virtual, "Preview does not block on a full-body scan")
    assert_true("Half Body" not in virtual and "Full Body" not in virtual, "Preview has no Half/Full Body selector")
    assert_true("scanType" not in session, "Session no longer stores a body-scan type")
    assert_true("SET_PORTRAIT_VIEW" not in session, "Session no longer stores Half/Full preview view")
    scan = (ROOT / "frontend" / "src" / "features" / "camera" / "AutoScanScreen.tsx").read_text()
    assert_true("Half Body" not in scan and "Full Body" not in scan, "Scan step is a single face scan")
    assert_true("Look at the camera" in scan, "Scan step asks for a face capture")
    assert_true("waist" not in scan.lower(), "Scan step does not require waist in frame")
    quality = (ROOT / "frontend" / "src" / "shared" / "lib" / "captureQuality.ts").read_text()
    assert_true("eyes_closed" in quality and "blurry" in quality, "Face scan checks eyes and blur")
    assert_true("ScanType" not in quality, "Capture quality is not split into half/full body modes")
    body = (ROOT / "frontend" / "src" / "shared" / "lib" / "tryOnBody.ts").read_text()
    assert_true("assessTryOnFraming" not in body, "Body-scan framing checks are removed")
    assert_true("Half-body scan required" not in body, "Half-body scan required message is gone")
    assert_true("onLightingChange" in preview, "Preview exposes lighting controls")
    assert_true("not stamped" not in preview, "Preview does not use the old accessory unavailable copy")
    assert_true("relighting model is not connected" not in preview, "Preview lighting can be selected")
    assert_true("Warm" in preview and "Cool" in preview, "Preview lighting includes Warm and Cool")
    assert_true("captureDataUrl={tryOnPhoto}" in app or "const tryOnPhoto = state.captureDataUrl" in app, "Preview uses the session scan")
    assert_true("SET_TRYON_CAPTURE" not in session, "Session no longer stores a second try-on capture")
    assert_true("bodyScan" not in session, "Session flow no longer includes a body-scan step")
    assert_true("preparePersonForTryOn" in virtual, "person frame is prepared for IDM-VTON")
    assert_true("accessories: accessoryIds" in virtual, "accessory ids are sent on the try-on request")
    assert_true("fp1:" in vton and "Barong Tagalog" in vton, "LOOK_VTON includes isolated Barong reference")
    assert_true("fp2:" in vton and "terno-base" in vton, "LOOK_VTON includes isolated Filipiniana dress reference")
    assert_true(not (ROOT / "frontend" / "src" / "shared" / "ui" / "LocalTryOn.tsx").exists(), "Local collage try-on component is removed")
    assert_true(not (ROOT / "frontend" / "src" / "shared" / "lib" / "faceFitCompositor.ts").exists(), "Face-paste compositor is removed")
    assert_true(not (ROOT / "frontend" / "src" / "shared" / "lib" / "portraitCompositor.ts").exists(), "Half/Full portrait compositor is removed")


def main() -> None:
    test_navy_dress_asset()
    test_prepare_dress_keeps_skirt()
    test_fit_portrait_modes()
    test_kiosk_capture_uses_cover()
    test_gray_studio_is_not_rejected()
    test_frontend_wiring()
    print("ALL PIPELINE CHECKS PASSED")


if __name__ == "__main__":
    main()
