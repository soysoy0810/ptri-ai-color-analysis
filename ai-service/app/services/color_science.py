"""
Skin-tone classification and palette recommendation.

Replaces an earlier scoring function that ranked colours by how *close*
they were to the measured skin colour (`score = 100 - deltaE * 1.35`).
That is backwards for colour analysis: a garment nearly identical to the
wearer's own skin is the classic "washed out" result. It reliably put
beige/peach/coral at the top for warm-light skin regardless of what
actually flatters.

What replaces it is standard personal-colour-analysis practice, expressed
numerically. Four measurable factors, combined into one score:

  1. UNDERTONE HARMONY (weight 0.40)
     Warm skin is flattered by warm-leaning colours, cool skin by
     cool-leaning ones. Undertone is read from the CIELAB hue angle of
     the skin, and each palette colour's warmth from its b* axis
     (yellow-positive / blue-negative). Low-chroma neutrals get a floor,
     since near-greys flatter every undertone.

  2. LIGHTNESS CONTRAST (weight 0.32)
     A colour needs to differ from the skin in lightness to define the
     face. Too little and the wearer looks washed out; too much and the
     garment overwhelms them. The ideal gap widens with skin depth
     (see DEPTH_TARGETS), and the score peaks at that gap rather than
     rewarding "as far as possible".

  3. CHROMA FIT (weight 0.20)
     Deeper skin carries higher-saturation colour comfortably; fairer
     skin is more easily overpowered by it. Scored against a per-depth
     target saturation.

  4. WASHOUT PENALTY (subtractive)
     An explicit penalty for colours within ~55 RGB units of the skin —
     the exact failure mode of the old algorithm.

Depth itself comes from ITA (Individual Typology Angle), the
dermatology-standard measure derived from L* and b*.
"""

from __future__ import annotations

import math
from typing import Dict, List, Tuple

from ..core.palette import hex_to_rgb, load_palette

Rgb = Tuple[float, float, float]
Lab = Tuple[float, float, float]


def rgb_to_lab(r: float, g: float, b: float) -> Lab:
    """sRGB -> CIELAB (D65)."""

    def pivot(c: float) -> float:
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r_l, g_l, b_l = pivot(r), pivot(g), pivot(b)
    x = (r_l * 0.4124 + g_l * 0.3576 + b_l * 0.1805) / 0.95047
    y = r_l * 0.2126 + g_l * 0.7152 + b_l * 0.0722
    z = (r_l * 0.0193 + g_l * 0.1192 + b_l * 0.9505) / 1.08883

    def f(t: float) -> float:
        return t ** (1 / 3) if t > 0.008856 else (7.787 * t) + (16 / 116)

    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy) - 16, 500 * (fx - fy), 200 * (fy - fz)


def delta_e(lab1: Lab, lab2: Lab) -> float:
    """CIE76 colour difference."""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(lab1, lab2)))


def rgb_distance(a: Rgb, b: Rgb) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


# Ideal lightness gap and saturation per skin depth. Deeper skin supports a
# larger contrast step and richer chroma before a colour starts to overwhelm.
DEPTH_TARGETS: Dict[str, Dict[str, float]] = {
    "very_light": {"contrast": 32, "chroma": 28},
    "fair": {"contrast": 32, "chroma": 28},
    "light": {"contrast": 35, "chroma": 34},
    "medium": {"contrast": 38, "chroma": 40},
    "tan": {"contrast": 42, "chroma": 46},
    "deep": {"contrast": 48, "chroma": 52},
}

# ITA (Individual Typology Angle) bands used in dermatology literature.
# Values sit *between* bands; classification uses the nearest band, but
# proximity to a boundary lowers confidence instead of flipping labels
# on a 0.1° wobble.
ITA_BANDS = (
    ("very_light", 55.0),
    ("light", 41.0),
    ("medium", 28.0),
    ("tan", 10.0),
    ("deep", -90.0),
)

DEPTH_LABELS = {
    "very_light": "Very Light",
    "light": "Light",
    "medium": "Medium",
    "tan": "Tan",
    "deep": "Deep",
}

UNDERTONE_LABELS = {
    "warm": "Warm",
    "cool": "Cool",
    "neutral": "Neutral",
    "warm-neutral": "Warm-Neutral",
    "cool-neutral": "Cool-Neutral",
}


def lab_to_rgb(lab: Lab) -> Rgb:
    """CIELAB (D65) → sRGB 0–255."""
    l_star, a_star, b_star = lab
    fy = (l_star + 16.0) / 116.0
    fx = a_star / 500.0 + fy
    fz = fy - b_star / 200.0

    def finv(t: float) -> float:
        t3 = t ** 3
        return t3 if t3 > 0.008856 else (t - 16 / 116) / 7.787

    x = finv(fx) * 0.95047
    y = finv(fy)
    z = finv(fz) * 1.08883
    r = x * 3.2406 + y * -1.5372 + z * -0.4986
    g = x * -0.9689 + y * 1.8758 + z * 0.0415
    b = x * 0.0557 + y * -0.2040 + z * 1.0570

    def encode(c: float) -> float:
        c = max(0.0, min(1.0, c))
        return (12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055) * 255.0

    return encode(r), encode(g), encode(b)


def _depth_from_ita(ita: float) -> tuple[str, float]:
    """Return (band, distance to nearest boundary in ITA degrees)."""
    prev = 90.0
    chosen = "deep"
    boundary = 10.0
    for name, edge in ITA_BANDS:
        if ita > edge:
            chosen = name
            boundary = min(abs(ita - edge), abs(ita - prev))
            return chosen, boundary
        prev = edge
    return chosen, abs(ita - 10.0)


def _undertone_from_hue(hue: float, chroma: float) -> tuple[str, float]:
    """Hue of a*/b* in Lab. Wide neutral band so small lighting wobble
    does not flip Warm ↔ Cool. Low chroma → Neutral / uncertain."""
    if chroma < 6.0:
        return "neutral", 0.35
    if hue > 62:
        return "warm", min(1.0, (hue - 62) / 12)
    if hue < 40:
        return "cool", min(1.0, (40 - hue) / 12)
    if hue >= 54:
        return "warm-neutral", 0.55
    if hue <= 48:
        return "cool-neutral", 0.55
    return "neutral", 0.8


def classify_skin(rgb: Rgb, extras: Dict | None = None) -> dict:
    """Undertone + depth from measured skin RGB, with a confidence score.

    Depth uses ITA = atan2(L* − 50, b*) in degrees.
    Undertone uses Lab hue = atan2(b*, a*).
    extras may include lighting_status, region_labs, frame_itas.
    This is camera-based analysis, not a spectrophotometer reading.
    """
    lab = rgb_to_lab(*rgb)
    return classify_skin_lab(lab, extras)


def classify_skin_lab(lab: Lab, extras: Dict | None = None) -> dict:
    extras = extras or {}
    l_star, a_star, b_star = lab
    ita = math.degrees(math.atan2(l_star - 50.0, b_star)) if b_star else 90.0
    hue = math.degrees(math.atan2(b_star, a_star)) if a_star else 90.0
    chroma = math.sqrt(a_star * a_star + b_star * b_star)
    depth, boundary = _depth_from_ita(ita)
    undertone, tone_certainty = _undertone_from_hue(hue, chroma)

    lighting = str(extras.get("lighting_status") or "good")
    lighting_factor = {
        "good": 1.0,
        "color_cast": 0.72,
        "harsh_shadows": 0.65,
        "too_dark": 0.32,
        "too_bright": 0.32,
    }.get(lighting, 0.6)

    region_labs: List[Lab] = extras.get("region_labs") or []
    if len(region_labs) >= 2:
        ab = [(p[1], p[2]) for p in region_labs]
        spread = math.sqrt(
            sum((x - sum(v[0] for v in ab) / len(ab)) ** 2 for x, _ in ab) / len(ab)
            + sum((y - sum(v[1] for v in ab) / len(ab)) ** 2 for _, y in ab) / len(ab)
        )
        region_factor = max(0.4, 1.0 - min(1.0, spread / 22.0))
    else:
        region_factor = 0.55

    frame_itas: List[float] = extras.get("frame_itas") or []
    if len(frame_itas) >= 2:
        mean_ita = sum(frame_itas) / len(frame_itas)
        var = sum((v - mean_ita) ** 2 for v in frame_itas) / len(frame_itas)
        frame_factor = max(0.3, 1.0 - min(1.0, math.sqrt(var) / 8.0))
    else:
        frame_factor = 0.62

    boundary_factor = max(0.35, min(1.0, boundary / 6.0))
    chroma_factor = max(0.4, min(1.0, chroma / 14.0))

    confidence = 100.0 * lighting_factor * (
        0.30 * region_factor
        + 0.30 * frame_factor
        + 0.20 * boundary_factor
        + 0.10 * chroma_factor
        + 0.10 * tone_certainty
    )
    confidence = max(8.0, min(97.0, confidence))

    message = None
    if lighting in ("too_dark", "too_bright"):
        message = "Please move to better lighting."
        confidence = min(confidence, 42.0)
    elif confidence < 55:
        message = "Low confidence — please rescan under even lighting."

    rgb = lab_to_rgb(lab)
    return {
        "undertone": undertone,
        "depth": depth,
        "depth_label": DEPTH_LABELS[depth],
        "undertone_label": UNDERTONE_LABELS[undertone],
        "ita": round(ita, 1),
        "hue_angle": round(hue, 1),
        "chroma": round(chroma, 2),
        "confidence": round(confidence, 1),
        "uncertain": confidence < 55,
        "message": message,
        "method": "camera-based ITA + Lab hue (not a spectrophotometer)",
        "lab": {"L": round(l_star, 2), "a": round(a_star, 2), "b": round(b_star, 2)},
        "rgb": {"r": round(rgb[0], 1), "g": round(rgb[1], 1), "b": round(rgb[2], 1)},
        "frames_used": extras.get("frames_used") or 1,
        "regions_used": extras.get("regions_used") or 0,
    }


_SKIN_WARMTH = {
    "warm": 1.0,
    "warm-neutral": 0.4,
    "neutral": 0.0,
    "cool-neutral": -0.4,
    "cool": -1.0,
}


def recommendation_reason(name: str, factors: Dict[str, float], skin: dict) -> str:
    """Plain-language reason from contrast / harmony / washout — not RGB closeness."""
    bits: List[str] = []
    if factors["lightness_contrast"] >= 0.7:
        bits.append("excellent contrast")
    elif factors["lightness_contrast"] >= 0.5:
        bits.append("good contrast")
    tone = skin.get("undertone_label") or skin.get("undertone", "measured")
    if factors["undertone_harmony"] >= 0.7:
        bits.append(f"complements {tone} undertone")
    elif factors["undertone_harmony"] >= 0.45:
        bits.append(f"balanced with {tone} undertone")
    if factors["chroma_fit"] >= 0.65 and factors["washout_penalty"] <= 4:
        bits.append("strong harmony")
    if factors["washout_penalty"] > 4:
        bits.append("softer contrast")
    if not bits:
        return f"{name} — balanced for the measured skin profile"
    return f"{name} — " + "; ".join(bits)


def rank_palette(sample_rgb: Rgb, skin: dict | None = None) -> List[dict]:
    """Rank every catalog colour for this skin tone.

    Returns each colour with its final score plus the individual factor
    scores, so the recommendation is inspectable rather than a black box.
    """
    skin = skin or classify_skin(sample_rgb)
    skin_lab = rgb_to_lab(*sample_rgb)
    target = DEPTH_TARGETS.get(skin["depth"], DEPTH_TARGETS["medium"])
    skin_warmth = _SKIN_WARMTH.get(skin["undertone"], 0.0)

    ranked = []
    for color in load_palette():
        c_rgb = hex_to_rgb(color["hex"])
        c_lab = rgb_to_lab(*c_rgb)
        chroma = math.sqrt(c_lab[1] ** 2 + c_lab[2] ** 2)

        # 1. Undertone harmony — b* drives perceived warmth; near-greys
        #    (low chroma) get a floor because they suit any undertone.
        color_warmth = max(-1.0, min(1.0, (c_lab[2] - 4) / 30))
        neutral_boost = 0.5 if chroma < 12 else 0.0
        harmony = max(neutral_boost, 1 - abs(skin_warmth * 0.75 - color_warmth) / 2)

        # 2. Lightness contrast — peaks at the depth-appropriate gap.
        d_l = abs(c_lab[0] - skin_lab[0])
        contrast_fit = max(0.0, 1 - abs(d_l - target["contrast"]) / 55)

        # 3. Chroma fit — saturation the skin depth can carry.
        chroma_fit = max(0.0, 1 - abs(chroma - target["chroma"]) / 60)

        # 4. Washout penalty — too close to the skin itself.
        dist = rgb_distance(sample_rgb, c_rgb)
        washout = (55 - dist) * 0.35 if dist < 55 else 0.0

        score = max(
            0.0,
            100 * (0.40 * harmony + 0.32 * contrast_fit + 0.20 * chroma_fit + 0.08)
            - washout,
        )
        factors = {
            "undertone_harmony": round(harmony, 3),
            "lightness_contrast": round(contrast_fit, 3),
            "chroma_fit": round(chroma_fit, 3),
            "washout_penalty": round(washout, 2),
        }

        ranked.append(
            {
                "id": color["id"],
                "name": color["name"],
                "hex": color["hex"],
                "score": round(score, 1),
                "delta_e": round(delta_e(skin_lab, c_lab), 2),
                "reason": recommendation_reason(color["name"], factors, skin),
                "factors": factors,
            }
        )

    ranked.sort(key=lambda c: c["score"], reverse=True)
    return ranked
