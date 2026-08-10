import { APPROVED_PALETTE, FABRICS } from '../../data/catalog';
import type { FabricItem, FaceRegion, LightingInfo, PaletteColor } from './types';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function rankPaletteFromSample(rgb: Rgb = { r: 180, g: 140, b: 120 }): PaletteColor[] {
  const scored = APPROVED_PALETTE.map((color) => {
    const c = hexToRgb(color.hex);
    const dist = colorDistance(rgb, c);
    const warmthBias = warmthScore(rgb) * warmthScore(c);
    const score = Math.max(0, 100 - dist * 0.35 + warmthBias * 4);
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

function warmthScore(rgb: Rgb): number {
  return (rgb.r - rgb.b) / 255;
}

/**
 * Average skin tone. When a detected face box is available, sample the inner
 * area of the face (avoiding hair and background) and keep only skin-like
 * pixels for an accurate reading.
 */
export function averageImageColor(canvas: HTMLCanvasElement, faceBox?: FaceRegion | null): Rgb {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { r: 180, g: 140, b: 120 };
  const { width, height } = canvas;

  // Inner 60% of the face box, or a centered fallback region
  const region = faceBox
    ? {
        x: (faceBox.x + faceBox.width * 0.2) * width,
        y: (faceBox.y + faceBox.height * 0.25) * height,
        w: faceBox.width * 0.6 * width,
        h: faceBox.height * 0.55 * height,
      }
    : { x: width * 0.3, y: height * 0.25, w: width * 0.4, h: height * 0.45 };

  const sample = ctx.getImageData(
    Math.max(0, Math.round(region.x)),
    Math.max(0, Math.round(region.y)),
    Math.max(1, Math.round(Math.min(region.w, width - region.x))),
    Math.max(1, Math.round(Math.min(region.h, height - region.y))),
  );

  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  let rAll = 0;
  let gAll = 0;
  let bAll = 0;
  let nAll = 0;
  for (let i = 0; i < sample.data.length; i += 16) {
    const pr = sample.data[i];
    const pg = sample.data[i + 1];
    const pb = sample.data[i + 2];
    rAll += pr;
    gAll += pg;
    bAll += pb;
    nAll += 1;
    // Skin heuristic: warm hue, reasonable brightness — skips hair/shadows
    if (pr > 60 && pr > pb && pr - pg > 8 && pg > pb - 10) {
      r += pr;
      g += pg;
      b += pb;
      n += 1;
    }
  }
  // Require enough skin pixels; otherwise fall back to the plain average
  if (n >= nAll * 0.15 && n > 20) {
    return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
  }
  if (nAll > 0) {
    return { r: Math.round(rAll / nAll), g: Math.round(gAll / nAll), b: Math.round(bAll / nAll) };
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
