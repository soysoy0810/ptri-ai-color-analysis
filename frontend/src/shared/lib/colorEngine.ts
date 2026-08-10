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

export interface SkinProfile {
  undertone: 'warm' | 'cool' | 'neutral';
  depth: 'fair' | 'light' | 'medium' | 'tan' | 'deep';
  /** Individual Typology Angle — the dermatology-standard skin depth measure */
  ita: number;
  lab: Lab;
  rgb: Rgb;
}

/**
 * Classify the visitor's skin using ITA (depth) and Lab hue balance
 * (undertone), so recommendations are grounded in real color science.
 */
export function analyzeSkinTone(rgb: Rgb): SkinProfile {
  const lab = srgbToLab(rgb);
  const ita = (Math.atan2(lab.L - 50, lab.b) * 180) / Math.PI;

  let depth: SkinProfile['depth'];
  if (ita > 55) depth = 'fair';
  else if (ita > 41) depth = 'light';
  else if (ita > 28) depth = 'medium';
  else if (ita > 10) depth = 'tan';
  else depth = 'deep';

  // Golden/yellow-leaning skin (high b* vs a*) = warm; pink/red-leaning = cool
  const hue = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  let undertone: SkinProfile['undertone'];
  if (hue > 58) undertone = 'warm';
  else if (hue < 44) undertone = 'cool';
  else undertone = 'neutral';

  return { undertone, depth, ita: Math.round(ita * 10) / 10, lab, rgb };
}

/** Ideal lightness contrast and chroma per skin depth, tuned for flattering looks */
const DEPTH_TARGETS: Record<SkinProfile['depth'], { contrast: number; chroma: number }> = {
  fair: { contrast: 32, chroma: 28 },
  light: { contrast: 35, chroma: 34 },
  medium: { contrast: 38, chroma: 40 },
  tan: { contrast: 42, chroma: 46 },
  deep: { contrast: 48, chroma: 52 },
};

/**
 * Rank the approved palette against the visitor's actual skin: undertone
 * harmony + lightness contrast + chroma fit, with a washout penalty for
 * colors too close to the skin itself.
 */
export function rankPaletteFromSample(rgb: Rgb = { r: 180, g: 140, b: 120 }): PaletteColor[] {
  const skin = analyzeSkinTone(rgb);
  const target = DEPTH_TARGETS[skin.depth];
  const skinWarmth = skin.undertone === 'warm' ? 1 : skin.undertone === 'cool' ? -1 : 0;

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
    };
  });

  return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
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
