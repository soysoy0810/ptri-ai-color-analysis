import { BACKGROUND_SCENES, BACKGROUND_SRC } from '../../data/garments';
import { api } from '../api/client';
import type { PortraitLighting } from './types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const LIGHTING_GAIN: Record<PortraitLighting, [number, number, number]> = {
  warm: [1.08, 1.01, 0.9],
  neutral: [1, 1, 1],
  cool: [0.92, 1.01, 1.1],
};

function applyLightingGrade(dataUrl: string, lighting: PortraitLighting): Promise<string> {
  const gain = LIGHTING_GAIN[lighting];
  if (gain[0] === 1 && gain[1] === 1 && gain[2] === 1) return Promise.resolve(dataUrl);
  return loadImage(dataUrl).then((img) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = frame.data;
    const [gr, gg, gb] = gain;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 8) continue;
      px[i] = Math.min(255, px[i] * gr);
      px[i + 1] = Math.min(255, px[i + 1] * gg);
      px[i + 2] = Math.min(255, px[i + 2] * gb);
    }
    ctx.putImageData(frame, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.92);
  });
}

function drawGradientBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  backgroundId: string,
): void {
  const scene = BACKGROUND_SCENES[backgroundId] || BACKGROUND_SCENES.studio;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, scene.from);
  grad.addColorStop(0.55, scene.via);
  grad.addColorStop(1, scene.to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

async function drawBackgroundLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  backgroundId: string,
): Promise<void> {
  const src = BACKGROUND_SRC[backgroundId];
  if (src) {
    try {
      const bg = await loadImage(src);
      const scale = Math.max(w / bg.naturalWidth, h / bg.naturalHeight);
      const bw = bg.naturalWidth * scale;
      const bh = bg.naturalHeight * scale;
      const bx = (w - bw) / 2;
      const by = (h - bh) / 2;
      ctx.drawImage(bg, bx, by, bw, bh);
      return;
    } catch {
      // Fall through to gradient when the PNG is missing.
    }
  }
  drawGradientBackground(ctx, w, h, backgroundId);
}

async function compositeBackground(
  personDataUrl: string,
  backgroundId: string,
): Promise<string | null> {
  if (!backgroundId || backgroundId === 'studio') {
    // Still replace a messy room with the studio gradient when using local try-on.
  }
  const seg = await api.segment(personDataUrl);
  if (!seg.segmented || !seg.mask) return null;

  const person = await loadImage(personDataUrl);
  const mask = await loadImage(seg.mask);
  const w = person.naturalWidth;
  const h = person.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  await drawBackgroundLayer(ctx, w, h, backgroundId);
  const bgData = ctx.getImageData(0, 0, w, h);

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const mctx = maskCanvas.getContext('2d')!;
  mctx.drawImage(mask, 0, 0, w, h);
  const maskData = mctx.getImageData(0, 0, w, h);

  const personCanvas = document.createElement('canvas');
  personCanvas.width = w;
  personCanvas.height = h;
  const pctx = personCanvas.getContext('2d')!;
  pctx.drawImage(person, 0, 0, w, h);
  const personData = pctx.getImageData(0, 0, w, h);

  const out = ctx.createImageData(w, h);
  for (let i = 0; i < out.data.length; i += 4) {
    const a = maskData.data[i] / 255;
    const edge = a > 0.04 && a < 0.96 ? a * a * (3 - 2 * a) : a;
    out.data[i] = personData.data[i] * edge + bgData.data[i] * (1 - edge);
    out.data[i + 1] = personData.data[i + 1] * edge + bgData.data[i + 1] * (1 - edge);
    out.data[i + 2] = personData.data[i + 2] * edge + bgData.data[i + 2] * (1 - edge);
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

export interface FinishedTryOn {
  dataUrl: string;
  background: 'composited' | 'failed' | 'skipped';
  accessories: 'fitted' | 'skipped';
  lighting: 'graded' | 'skipped';
}

export async function finishGeneratedTryOn(options: {
  generatedDataUrl: string;
  backgroundId: string;
  lighting?: PortraitLighting;
  /** Local try-on keeps the capture room — replace it with the selected scene. */
  compositeBackground?: boolean;
}): Promise<FinishedTryOn> {
  const lighting = options.lighting || 'neutral';
  let dataUrl = options.generatedDataUrl;
  let lightingStatus: FinishedTryOn['lighting'] = 'skipped';
  let backgroundStatus: FinishedTryOn['background'] = 'skipped';

  if (lighting !== 'neutral') {
    try {
      dataUrl = await applyLightingGrade(dataUrl, lighting);
      lightingStatus = 'graded';
    } catch {
      lightingStatus = 'skipped';
    }
  }

  if (options.compositeBackground !== false) {
    try {
      const composited = await compositeBackground(dataUrl, options.backgroundId || 'studio');
      if (composited) {
        dataUrl = composited;
        backgroundStatus = 'composited';
      } else {
        backgroundStatus = 'failed';
      }
    } catch {
      backgroundStatus = 'failed';
    }
  }

  return {
    dataUrl,
    background: backgroundStatus,
    accessories: 'skipped',
    lighting: lightingStatus,
  };
}
