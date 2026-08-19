import { APPROVED_PALETTE, FABRICS } from '../../data/catalog';
import type { FabricItem, FaceRegion, LightingInfo, PaletteColor } from './types';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Palette used for ranking — bundled by default, replaced by the DB catalog when the API is online */
let ACTIVE_PALETTE: PaletteColor[] = APPROVED_PALETTE;

export function setActivePalette(colors: PaletteColor[]): void {
  if (colors.length) ACTIVE_PALETTE = colors;
}

interface Lab {
  L: number;
  a: number;
  b: number;
}

/** sRGB → CIELAB (D65), the perceptual space used for real color analysis */
function srgbToLab({ r, g, b }: Rgb): Lab {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  // sRGB → XYZ (D65)
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export type SkinDepth = 'very_light' | 'light' | 'medium' | 'tan' | 'deep';
export type SkinUndertone = 'warm' | 'cool' | 'neutral' | 'warm-neutral' | 'cool-neutral';

export interface SkinProfile {
  undertone: SkinUndertone;
  depth: SkinDepth;
  /** Individual Typology Angle — dermatology-standard skin depth measure */
  ita: number;
  lab: Lab;
  rgb: Rgb;
  /** 0–100. Camera-based estimate, not a lab instrument. */
  confidence: number;
  chroma?: number;
  message?: string | null;
  framesUsed?: number;
}

export const DEPTH_LABELS: Record<SkinDepth, string> = {
  very_light: 'Very Light',
  light: 'Light',
  medium: 'Medium',
  tan: 'Tan',
  deep: 'Deep',
};

export const UNDERTONE_LABELS: Record<SkinUndertone, string> = {
  warm: 'Warm',
  cool: 'Cool',
  neutral: 'Neutral',
  'warm-neutral': 'Warm-Neutral',
  'cool-neutral': 'Cool-Neutral',
};

export function depthLabel(depth: string): string {
  if (depth === 'fair') return DEPTH_LABELS.very_light;
  return DEPTH_LABELS[depth as SkinDepth] || depth;
}

export function undertoneLabel(tone: string): string {
  return UNDERTONE_LABELS[tone as SkinUndertone] || tone;
}

/**
 * Classify the visitor's skin using ITA (depth) and Lab hue
 * (undertone). Matches the server bands so a client re-rank stays consistent.
 */
export function analyzeSkinTone(rgb: Rgb): SkinProfile {
  const lab = srgbToLab(rgb);
  const ita = (Math.atan2(lab.L - 50, lab.b) * 180) / Math.PI;
  const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  const hue = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;

  let depth: SkinDepth;
  if (ita > 55) depth = 'very_light';
  else if (ita > 41) depth = 'light';
  else if (ita > 28) depth = 'medium';
  else if (ita > 10) depth = 'tan';
  else depth = 'deep';

  let undertone: SkinUndertone;
  if (chroma < 6) undertone = 'neutral';
  else if (hue > 62) undertone = 'warm';
  else if (hue < 40) undertone = 'cool';
  else if (hue >= 54) undertone = 'warm-neutral';
  else if (hue <= 48) undertone = 'cool-neutral';
  else undertone = 'neutral';

  return {
    undertone,
    depth,
    ita: Math.round(ita * 10) / 10,
    lab,
    rgb,
    confidence: 62,
    chroma: Math.round(chroma * 100) / 100,
  };
}

export function profileFromServer(res: {
  sample_rgb?: Rgb;
  skin_profile?: Record<string, unknown> | null;
}): SkinProfile {
  const p = res.skin_profile || {};
  const rgb = res.sample_rgb || { r: 180, g: 140, b: 120 };
  if (p.depth && p.undertone) {
    const labObj = p.lab as { L?: number; a?: number; b?: number } | undefined;
    const lab = labObj?.L != null ? { L: labObj.L, a: labObj.a ?? 0, b: labObj.b ?? 0 } : srgbToLab(rgb);
    const rawDepth = String(p.depth) === 'fair' ? 'very_light' : String(p.depth);
    return {
      undertone: String(p.undertone) as SkinUndertone,
      depth: rawDepth as SkinDepth,
      ita: Number(p.ita) || 0,
      lab,
      rgb,
      confidence: Number(p.confidence) || 0,
      chroma: p.chroma != null ? Number(p.chroma) : undefined,
      message: (p.message as string) || null,
      framesUsed: p.frames_used != null ? Number(p.frames_used) : undefined,
    };
  }
  return analyzeSkinTone(rgb);
}

/** Ideal lightness contrast and chroma per skin depth, tuned for flattering looks */
const DEPTH_TARGETS: Record<string, { contrast: number; chroma: number }> = {
  very_light: { contrast: 32, chroma: 28 },
  fair: { contrast: 32, chroma: 28 },
  light: { contrast: 35, chroma: 34 },
  medium: { contrast: 38, chroma: 40 },
  tan: { contrast: 42, chroma: 46 },
  deep: { contrast: 48, chroma: 52 },
};

const SKIN_WARMTH: Record<string, number> = {
  warm: 1,
  'warm-neutral': 0.4,
  neutral: 0,
  'cool-neutral': -0.4,
  cool: -1,
};

/**
 * Rank the approved palette against the visitor's actual skin: undertone
 * harmony + lightness contrast + chroma fit, with a washout penalty for
 * colors too close to the skin itself.
 */
export function rankPaletteFromSample(rgb: Rgb = { r: 180, g: 140, b: 120 }): PaletteColor[] {
  const skin = analyzeSkinTone(rgb);
  const target = DEPTH_TARGETS[skin.depth] || DEPTH_TARGETS.medium;
  const skinWarmth = SKIN_WARMTH[skin.undertone] ?? 0;

  const scored = ACTIVE_PALETTE.map((color) => {
    const cRgb = hexToRgb(color.hex);
    const cLab = srgbToLab(cRgb);
    const chroma = Math.sqrt(cLab.a * cLab.a + cLab.b * cLab.b);

    // Warm colors have high b* (golden); cool colors negative/low b*
    const colorWarmth = Math.max(-1, Math.min(1, (cLab.b - 4) / 30));
    // Neutrals (very low chroma) flatter every undertone
    const neutralBoost = chroma < 12 ? 0.5 : 0;
    const harmony = Math.max(
      neutralBoost,
      1 - Math.abs(skinWarmth * 0.75 - colorWarmth) / 2,
    );

    const dL = Math.abs(cLab.L - skin.lab.L);
    const contrastFit = Math.max(0, 1 - Math.abs(dL - target.contrast) / 55);

    const chromaFit = Math.max(0, 1 - Math.abs(chroma - target.chroma) / 60);

    // Colors nearly identical to the skin look washed out
    const dist = colorDistance(rgb, cRgb);
    const washout = dist < 55 ? (55 - dist) * 0.35 : 0;

    const score = Math.max(
      0,
      100 * (0.4 * harmony + 0.32 * contrastFit + 0.2 * chromaFit + 0.08) - washout,
    );

    return {
      ...color,
      score: Math.round(score * 10) / 10,
      delta_e: Math.round(dist * 10) / 10,
      factors: {
        undertone_harmony: Math.round(harmony * 1000) / 1000,
        lightness_contrast: Math.round(contrastFit * 1000) / 1000,
        chroma_fit: Math.round(chromaFit * 1000) / 1000,
        washout_penalty: Math.round(washout * 100) / 100,
      },
    };
  });

  return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/** Plain-language reason a ranked color suits the measured skin — not "it looks like your skin". */
export function explainColorFit(color: PaletteColor, skin?: SkinProfile | null): string {
  if (color.reason) return color.reason;
  const tone = skin ? undertoneLabel(skin.undertone) : 'your';
  const depth = skin ? depthLabel(skin.depth) : undefined;
  const f = color.factors;
  const parts: string[] = [];
  if (f?.lightness_contrast != null && f.lightness_contrast >= 0.7) {
    parts.push('excellent contrast');
  } else if (f?.lightness_contrast != null && f.lightness_contrast >= 0.5) {
    parts.push(depth ? `good contrast for ${depth} skin` : 'good contrast');
  }
  if (f?.undertone_harmony != null && f.undertone_harmony >= 0.68) {
    parts.push(`complements ${tone} undertone`);
  }
  if (f?.chroma_fit != null && f.chroma_fit >= 0.65) {
    parts.push('strong harmony');
  }
  if (f?.washout_penalty != null && f.washout_penalty > 4) {
    parts.push('softer contrast');
  }
  if (!parts.length) {
    return `${color.name} — balanced for the measured skin profile`;
  }
  return `${color.name} — ${parts.join('; ')}.`;
}

export function matchFabrics(selectedColors: PaletteColor[] = []): FabricItem[] {
  const selectedHexes = selectedColors.map((c) => c.hex);
  return FABRICS.map((fabric) => {
    const best = selectedHexes.length
      ? Math.min(...selectedHexes.map((h) => colorDistance(hexToRgb(h), hexToRgb(fabric.hex))))
      : 40;
    const match = Math.max(
      55,
      Math.min(99, Math.round((fabric.base_match || 80) - best * 0.2)),
    );
    return { ...fabric, match };
  }).sort((a, b) => (b.match ?? 0) - (a.match ?? 0));
}

export interface SkinToneCandidate {
  label: string;
  rgb: Rgb;
}

const REGION_LABELS: Record<string, string> = {
  forehead: 'Forehead',
  left_cheek: 'Left Cheek',
  right_cheek: 'Right Cheek',
  nose_bridge: 'Nose',
  chin: 'Chin',
};

const REGION_ORDER = ['left_cheek', 'forehead', 'nose_bridge', 'right_cheek', 'chin'];

/**
 * The 5 selectable skin-tone candidates, built directly from the AI
 * service's real per-region samples (forehead/cheeks/nose/chin) — not a
 * synthetic brightness ramp. `matchIndex` is whichever real region sits
 * closest to the combined median, i.e. the AI's own best single estimate.
 */
export function skinToneCandidatesFromRegions(
  regions: Record<string, Rgb>,
  overall: Rgb,
): { swatches: SkinToneCandidate[]; matchIndex: number } {
  const swatches = REGION_ORDER.filter((key) => regions[key]).map((key) => ({
    label: REGION_LABELS[key] || key,
    rgb: regions[key],
  }));
  let matchIndex = 0;
  let best = Infinity;
  swatches.forEach((c, i) => {
    const d = colorDistance(overall, c.rgb);
    if (d < best) {
      best = d;
      matchIndex = i;
    }
  });
  return { swatches, matchIndex };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

interface Accumulator {
  r: number;
  g: number;
  b: number;
  n: number;
  rAll: number;
  gAll: number;
  bAll: number;
  nAll: number;
}

function sampleRegion(
  ctx: CanvasRenderingContext2D,
  acc: Accumulator,
  x: number,
  y: number,
  w: number,
  h: number,
  width: number,
  height: number,
): void {
  const sx = Math.max(0, Math.round(x));
  const sy = Math.max(0, Math.round(y));
  const sw = Math.max(1, Math.round(Math.min(w, width - sx)));
  const sh = Math.max(1, Math.round(Math.min(h, height - sy)));
  const sample = ctx.getImageData(sx, sy, sw, sh);
  for (let i = 0; i < sample.data.length; i += 8) {
    const pr = sample.data[i];
    const pg = sample.data[i + 1];
    const pb = sample.data[i + 2];
    // Skip clipped highlights and deep shadows — they corrupt the reading
    if (pr > 248 && pg > 248 && pb > 248) continue;
    if (pr + pg + pb < 75) continue;
    acc.rAll += pr;
    acc.gAll += pg;
    acc.bAll += pb;
    acc.nAll += 1;
    // Skin heuristic: warm hue, reasonable brightness — skips hair, eyes, lips shadows
    if (pr > 60 && pr > pb && pr - pg > 8 && pg > pb - 10) {
      acc.r += pr;
      acc.g += pg;
      acc.b += pb;
      acc.n += 1;
    }
  }
}

/**
 * Skin tone reading. With a detected face box we sample the forehead and both
 * cheeks — the flattest, most reliable skin areas — instead of the whole face,
 * so eyes, lips, brows, and hair never skew the result.
 */
export function averageImageColor(canvas: HTMLCanvasElement, faceBox?: FaceRegion | null): Rgb {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { r: 180, g: 140, b: 120 };
  const { width, height } = canvas;

  const acc: Accumulator = { r: 0, g: 0, b: 0, n: 0, rAll: 0, gAll: 0, bAll: 0, nAll: 0 };

  if (faceBox) {
    const fx = faceBox.x * width;
    const fy = faceBox.y * height;
    const fw = faceBox.width * width;
    const fh = faceBox.height * height;
    // Forehead
    sampleRegion(ctx, acc, fx + fw * 0.3, fy + fh * 0.1, fw * 0.4, fh * 0.14, width, height);
    // Left cheek
    sampleRegion(ctx, acc, fx + fw * 0.14, fy + fh * 0.45, fw * 0.24, fh * 0.22, width, height);
    // Right cheek
    sampleRegion(ctx, acc, fx + fw * 0.62, fy + fh * 0.45, fw * 0.24, fh * 0.22, width, height);
  } else {
    sampleRegion(ctx, acc, width * 0.3, height * 0.25, width * 0.4, height * 0.45, width, height);
  }

  // Require enough skin pixels; otherwise fall back to the plain average
  if (acc.n >= acc.nAll * 0.15 && acc.n > 20) {
    return {
      r: Math.round(acc.r / acc.n),
      g: Math.round(acc.g / acc.n),
      b: Math.round(acc.b / acc.n),
    };
  }
  if (acc.nAll > 0) {
    return {
      r: Math.round(acc.rAll / acc.nAll),
      g: Math.round(acc.gAll / acc.nAll),
      b: Math.round(acc.bAll / acc.nAll),
    };
  }
  return { r: 180, g: 140, b: 120 };
}

// Canonical MediaPipe Face Mesh landmark indices (stable topology) that sit
// on bare skin, clear of eyebrows, eyelids, lips and the hairline.
const SKIN_REGIONS: Record<string, number[]> = {
  forehead: [151, 108, 337, 9],
  leftCheek: [50, 101],
  rightCheek: [280, 330],
  noseBridge: [6],
  chin: [152, 175],
};

function medianOf(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function patchPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): number[][] {
  const x0 = Math.max(0, Math.round(cx - radius));
  const x1 = Math.min(width, Math.round(cx + radius + 1));
  const y0 = Math.max(0, Math.round(cy - radius));
  const y1 = Math.min(height, Math.round(cy + radius + 1));
  const pixels: number[][] = [];
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * width + x) * 4;
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  return pixels;
}

/**
 * Drops pixels far from a patch's dominant color cluster (median absolute
 * deviation), so a stray hair, eyelash, specular highlight or shadow edge
 * that leaks into a landmark patch doesn't skew it. Statistical, not a
 * fixed skin-color range, so it doesn't bias toward lighter or darker skin.
 */
function rejectOutliers(pixels: number[][], k = 2.5): number[][] {
  if (pixels.length < 5) return pixels;
  const mr = medianOf(pixels.map((p) => p[0]));
  const mg = medianOf(pixels.map((p) => p[1]));
  const mb = medianOf(pixels.map((p) => p[2]));
  const dists = pixels.map((p) => Math.hypot(p[0] - mr, p[1] - mg, p[2] - mb));
  const mad = medianOf(dists) || 1;
  const threshold = k * mad * 1.4826;
  const filtered = pixels.filter((_, i) => dists[i] <= threshold);
  return filtered.length >= Math.max(3, pixels.length * 0.15) ? filtered : pixels;
}

/**
 * Median skin RGB pooled from true-skin landmark patches (forehead, both
 * cheeks, nose bridge, chin) — accurate and unbiased by eyes/brows/lips/
 * hair, and robust to one bad patch (glare, shadow) via per-patch outlier
 * rejection plus a cross-region median. Needs real face landmarks (see
 * useFaceLandmarker); returns null if none are available so callers can
 * fall back to the coarser face-box heuristic.
 */
export function sampleSkinFromLandmarks(
  canvas: HTMLCanvasElement,
  landmarks: Array<[number, number]>,
): Rgb | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const radius = Math.max(3, Math.min(width, height) / 60);

  const regionMedians: number[][] = [];
  for (const indices of Object.values(SKIN_REGIONS)) {
    let pooled: number[][] = [];
    for (const idx of indices) {
      const lm = landmarks[idx];
      if (!lm) continue;
      pooled = pooled.concat(patchPixels(data, width, height, lm[0] * width, lm[1] * height, radius));
    }
    if (!pooled.length) continue;
    const filtered = rejectOutliers(pooled);
    if (!filtered.length) continue;
    regionMedians.push([
      medianOf(filtered.map((p) => p[0])),
      medianOf(filtered.map((p) => p[1])),
      medianOf(filtered.map((p) => p[2])),
    ]);
  }

  if (!regionMedians.length) return null;
  return {
    r: Math.round(medianOf(regionMedians.map((m) => m[0]))),
    g: Math.round(medianOf(regionMedians.map((m) => m[1]))),
    b: Math.round(medianOf(regionMedians.map((m) => m[2]))),
  };
}

export function assessLighting(canvas: HTMLCanvasElement): LightingInfo {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { mean_luma: 120, contrast: 30, status: 'fair' };
  }
  const { width, height } = canvas;
  const sample = ctx.getImageData(width * 0.25, height * 0.2, width * 0.5, height * 0.55);
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let i = 0; i < sample.data.length; i += 16) {
    const luma =
      0.2126 * sample.data[i] + 0.7152 * sample.data[i + 1] + 0.0722 * sample.data[i + 2];
    sum += luma;
    sumSq += luma * luma;
    n += 1;
  }
  const mean = n ? sum / n : 0;
  const variance = n ? sumSq / n - mean * mean : 0;
  const contrast = Math.sqrt(Math.max(0, variance));
  let status: LightingInfo['status'] = 'fair';
  if (mean >= 90 && mean <= 190 && contrast >= 18) status = 'good';
  else if (mean < 55 || mean > 220 || contrast < 10) status = 'poor';
  return {
    mean_luma: Math.round(mean * 10) / 10,
    contrast: Math.round(contrast * 10) / 10,
    status,
  };
}
