import { APPROVED_PALETTE, FABRICS } from '../../data/catalog';
import type { FabricItem, LightingInfo, PaletteColor } from './types';

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

export function averageImageColor(canvas: HTMLCanvasElement): Rgb {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { r: 180, g: 140, b: 120 };
  const { width, height } = canvas;
  const sample = ctx.getImageData(width * 0.3, height * 0.25, width * 0.4, height * 0.45);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < sample.data.length; i += 16) {
    r += sample.data[i];
    g += sample.data[i + 1];
    b += sample.data[i + 2];
    n += 1;
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
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
