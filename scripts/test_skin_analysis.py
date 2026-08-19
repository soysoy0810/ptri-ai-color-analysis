#!/usr/bin/env python3
"""Repeat-scan consistency tests for camera-based skin analysis.

Logs LAB / ITA / undertone / depth / confidence only — no identity photos.
Does not claim spectrophotometer accuracy.
"""

from __future__ import annotations

import base64
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ai-service"))

from app.services.color_analysis import analyze_image  # noqa: E402
from app.services.color_science import classify_skin  # noqa: E402


def assert_true(cond: bool, msg: str) -> None:
    if not cond:
        raise SystemExit(f"FAIL: {msg}")
    print(f"PASS: {msg}")


def to_data_url(img: Image.Image, quality: int = 90) -> str:
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=quality)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def tint(img: Image.Image, r: float = 1.0, g: float = 1.0, b: float = 1.0, brightness: float = 1.0) -> Image.Image:
    arr = np.asarray(img.convert("RGB")).astype(np.float32)
    arr *= np.array([r, g, b], dtype=np.float32) * brightness
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode="RGB")


def noise(img: Image.Image, sigma: float, seed: int) -> Image.Image:
    rng = np.random.RandomState(seed)
    arr = np.asarray(img.convert("RGB")).astype(np.float32)
    arr += rng.normal(0.0, sigma, arr.shape)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode="RGB")


def log_profile(label: str, result: dict) -> None:
    p = result["skin_profile"]
    lab = p["lab"]
    print(
        f"  {label}: L*={lab['L']:.2f} a*={lab['a']:.2f} b*={lab['b']:.2f} "
        f"ITA={p['ita']:.1f} undertone={p['undertone']} depth={p['depth']} "
        f"confidence={p['confidence']:.1f} frames={p.get('frames_used')}"
    )


def key(result: dict) -> tuple:
    p = result["skin_profile"]
    lab = p["lab"]
    return (
        p["depth"],
        p["undertone"],
        round(p["ita"], 1),
        round(lab["L"], 2),
        round(lab["a"], 2),
        round(lab["b"], 2),
    )


def test_classify_deterministic() -> None:
    samples = {
        "very_light": (232, 208, 190),
        "light": (210, 170, 140),
        "medium": (168, 118, 88),
        "tan": (128, 86, 58),
        "deep": (72, 46, 34),
    }
    for name, rgb in samples.items():
        a = classify_skin(rgb)
        b = classify_skin(rgb)
        assert_true(a == b, f"classify_skin({name}) is identical on repeat")
        print(
            f"  {name} rgb={rgb} → depth={a['depth']} undertone={a['undertone']} "
            f"ITA={a['ita']} hue={a['hue_angle']} conf={a['confidence']}"
        )


def test_same_image_twice(img: Image.Image) -> dict:
    url = to_data_url(img)
    a = analyze_image(url)
    b = analyze_image(url)
    log_profile("run 1", a)
    log_profile("run 2", b)
    assert_true(key(a) == key(b), "same JPEG analyzed twice produces identical classification")
    assert_true(a["top20"][0]["id"] == b["top20"][0]["id"], "same image keeps the same top recommended color")
    return a


def test_multi_frame_median(img: Image.Image, baseline: dict) -> None:
    url = to_data_url(img)
    extras = [url, url, url, url]
    multi = analyze_image(url, extra_images=extras)
    log_profile("5 identical frames", multi)
    assert_true(
        multi["skin_profile"]["depth"] == baseline["skin_profile"]["depth"],
        "multi-frame median keeps the same depth on identical frames",
    )
    assert_true(
        multi["skin_profile"]["undertone"] == baseline["skin_profile"]["undertone"],
        "multi-frame median keeps the same undertone on identical frames",
    )
    assert_true(int(multi["model"]["frames_used"]) >= 5, "multi-frame path actually used extra frames")


def test_consecutive_noisy_frames(img: Image.Image, baseline: dict) -> None:
    frames = [to_data_url(noise(img, 1.5, seed)) for seed in range(5)]
    result = analyze_image(frames[0], extra_images=frames[1:])
    log_profile("5 noisy consecutive frames", result)
    depths = {baseline["skin_profile"]["depth"], result["skin_profile"]["depth"]}
    tones = {baseline["skin_profile"]["undertone"], result["skin_profile"]["undertone"]}
    ita_delta = abs(result["skin_profile"]["ita"] - baseline["skin_profile"]["ita"])
    print(f"  ITA delta vs baseline: {ita_delta:.2f}°")
    assert_true(len(depths) == 1, f"small sensor noise must not flip depth {depths}")
    assert_true(len(tones) == 1, f"small sensor noise must not flip undertone {tones}")
    assert_true(ita_delta < 4.0, f"ITA moved {ita_delta:.2f}° under tiny noise — too unstable")


def test_lighting_conditions(img: Image.Image, baseline: dict) -> None:
    cases = {
        "warm tungsten": tint(img, r=1.18, g=1.02, b=0.82),
        "cool fluorescent": tint(img, r=0.86, g=1.0, b=1.18),
        "low light": tint(img, brightness=0.55),
        "bright": tint(img, brightness=1.28),
    }
    print("Lighting variation (expected to move ITA; labels may change under strong casts):")
    base_depth = baseline["skin_profile"]["depth"]
    base_tone = baseline["skin_profile"]["undertone"]
    for name, variant in cases.items():
        result = analyze_image(to_data_url(variant))
        p = result["skin_profile"]
        q = result["lighting"]
        log_profile(f"{name} (face luma={q.get('mean_luma')} status={q.get('status')})", result)
        print(
            f"    vs baseline: depth {base_depth}→{p['depth']}  "
            f"undertone {base_tone}→{p['undertone']}  "
            f"ITA {baseline['skin_profile']['ita']}→{p['ita']}  "
            f"message={p.get('message')}"
        )
        if name == "low light":
            assert_true(
                p["confidence"] < 55 or q.get("status") == "too_dark",
                "low light must not return a high-confidence classification",
            )


def test_recommendation_reasons(baseline: dict) -> None:
    top = baseline["top20"][:4]
    assert_true(all(c.get("reason") for c in top), "top colors include a recommendation reason")
    for c in top:
        print(f"  {c['score']:5.1f}  {c['reason']}")
    names = " ".join(c["name"].lower() for c in top)
    # Washout: a near-skin beige should not automatically win solely by RGB closeness.
    assert_true("reason" in top[0], "first recommendation is explained")
    print(f"  top names: {names}")


def main() -> None:
    print("=== Skin analysis consistency ===")
    test_classify_deterministic()

    photo = ROOT / "frontend" / "public" / "models" / "template-female-studio.png"
    assert_true(photo.exists(), f"test portrait exists ({photo.name})")
    img = Image.open(photo).convert("RGB")

    print("\nSame image, twice:")
    baseline = test_same_image_twice(img)

    print("\nMulti-frame identical copies:")
    test_multi_frame_median(img, baseline)

    print("\nConsecutive noisy frames (same person, tiny webcam wobble):")
    test_consecutive_noisy_frames(img, baseline)

    print("\nLighting conditions:")
    test_lighting_conditions(img, baseline)

    print("\nSecond portrait (different person):")
    male = ROOT / "frontend" / "public" / "models" / "template-male-office.png"
    if male.exists():
        male_img = Image.open(male).convert("RGB")
        male_a = analyze_image(to_data_url(male_img))
        male_b = analyze_image(to_data_url(male_img))
        log_profile("male run 1", male_a)
        log_profile("male run 2", male_b)
        assert_true(key(male_a) == key(male_b), "second portrait is also repeat-stable")
    else:
        print("  skipped (no male template)")
    test_recommendation_reasons(baseline)

    print("\nALL SKIN ANALYSIS TESTS PASSED")


if __name__ == "__main__":
    main()
