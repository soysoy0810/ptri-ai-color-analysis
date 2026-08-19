import type { NormPoint } from '../hooks/useFaceLandmarker';

/** Same MediaPipe Face Mesh indices the Python skin sampler uses. */
export const SKIN_REGIONS: Record<string, readonly number[]> = {
  forehead: [151, 108, 337, 9],
  left_cheek: [50, 101],
  right_cheek: [280, 330],
  nose_bridge: [6],
  chin: [152, 175],
};

export const SKIN_REGION_ORDER = ['forehead', 'left_cheek', 'right_cheek', 'nose_bridge', 'chin'] as const;

export type SkinRegionName = (typeof SKIN_REGION_ORDER)[number];

export interface LiveSkinSample {
  name: SkinRegionName;
  rgb: { r: number; g: number; b: number };
  pixels: number;
}

function patchMean(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): { r: number; g: number; b: number; n: number } {
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(width, Math.ceil(cx + radius + 1));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(height, Math.ceil(cy + radius + 1));
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * width + x) * 4;
      const rr = data[i];
      const gg = data[i + 1];
      const bb = data[i + 2];
      const max = Math.max(rr, gg, bb);
      const min = Math.min(rr, gg, bb);
      // Drop specular white and near-black (hair / shadow) so the live
      // sample matches the server's "skin only" rule.
      if (max > 248 && min > 240) continue;
      if (rr + gg + bb < 90) continue;
      r += rr;
      g += gg;
      b += bb;
      n += 1;
    }
  }
  return { r: n ? r / n : 0, g: n ? g / n : 0, b: n ? b / n : 0, n };
}

/**
 * Live landmark skin patches from the camera frame. This is the same
 * region set the AI service uses after capture — so the hold is real
 * sampling, not a decorative delay.
 */
export function sampleLiveSkinRegions(
  frame: ImageData,
  landmarks: NormPoint[] | null,
): LiveSkinSample[] {
  if (!landmarks || landmarks.length < 400) return [];
  const { data, width, height } = frame;
  const radius = Math.max(3, Math.round(Math.min(width, height) * 0.035));
  const out: LiveSkinSample[] = [];

  for (const name of SKIN_REGION_ORDER) {
    const ids = SKIN_REGIONS[name];
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (const id of ids) {
      const pt = landmarks[id];
      if (!pt) continue;
      const patch = patchMean(data, width, height, pt[0] * width, pt[1] * height, radius);
      if (patch.n < 8) continue;
      r += patch.r * patch.n;
      g += patch.g * patch.n;
      b += patch.b * patch.n;
      n += patch.n;
    }
    if (n < 12) continue;
    out.push({
      name,
      rgb: { r: r / n, g: g / n, b: b / n },
      pixels: n,
    });
  }
  return out;
}
