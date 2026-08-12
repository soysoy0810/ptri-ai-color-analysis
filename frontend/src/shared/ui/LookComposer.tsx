import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BACKGROUND_SCENES,
  BACKGROUND_SRC,
  GARMENT_BASE_SRC,
  HERITAGE_GARMENTS,
  MODEL_SRC,
  TEMPLATE_TORSO_MASK,
  TORSO_MASK,
  FACE_ON_MODEL,
  tryOnModelSrc,
  modelGenderFromProfile,
  type GarmentKey,
  type ModelGender,
  type TorsoMask,
} from '../../data/garments';
import type { FaceRegion } from '../lib/types';

interface LookComposerProps {
  captureDataUrl: string | null;
  faceBox?: FaceRegion | null;
  garmentKey: GarmentKey;
  fabricHex: string;
  backgroundId: string;
  designName?: string;
  gender?: string | null;
  /** Admin-uploaded try-on garment PNG (optional) */
  tryonImageUrl?: string | null;
  className?: string;
  fullBleed?: boolean;
  fitContain?: boolean;
}

const OUT_W = 720;
const OUT_H = 900;
/** Head → upper waist; arms and hands stay in frame */
const PORTRAIT_CROP = 0.58;

const FACE_ON_PORTRAIT: Record<ModelGender, { top: number; width: number }> = {
  female: { top: 0.045, width: 0.3 },
  male: { top: 0.048, width: 0.29 },
};

const GARMENT_NECK_ANCHOR: Record<GarmentKey, number> = {
  polo: 0.14,
  'active-tee': 0.13,
  'linen-shirt': 0.13,
  'formal-shirt': 0.12,
  barong: 0.11,
  'collar-blouse': 0.12,
  terno: 0.09,
  'filipiniana-blouse': 0.1,
};

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function colorDist(r: number, g: number, b: number, ref: [number, number, number]): number {
  return Math.abs(r - ref[0]) + Math.abs(g - ref[1]) + Math.abs(b - ref[2]);
}

function cropPortraitTop(model: HTMLImageElement): HTMLCanvasElement {
  const cropH = Math.round(model.height * PORTRAIT_CROP);
  const canvas = document.createElement('canvas');
  canvas.width = model.width;
  canvas.height = cropH;
  canvas.getContext('2d')!.drawImage(model, 0, 0, model.width, cropH, 0, 0, model.width, cropH);
  return canvas;
}

function isSkinPixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return r > 55 && g > 32 && b > 18 && max - min > 10 && r >= g - 12;
}

function modelToCanvas(model: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = model.width;
  canvas.height = model.height;
  canvas.getContext('2d')!.drawImage(model, 0, 0);
  return canvas;
}

function removeEdgeBackground(canvas: HTMLCanvasElement, tolerance = 44): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const frame = ctx.getImageData(0, 0, w, h);
  const px = frame.data;
  const bg: [number, number, number] = [px[0], px[1], px[2]];
  const visited = new Uint8Array(w * h);
  const remove = new Uint8Array(w * h);
  const queue: number[] = [];

  const idx = (x: number, y: number) => y * w + x;
  const tryAdd = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = idx(x, y);
    if (visited[i]) return;
    visited[i] = 1;
    const pi = i * 4;
    if (colorDist(px[pi], px[pi + 1], px[pi + 2], bg) < tolerance) {
      remove[i] = 1;
      queue.push(i);
    }
  };

  for (let x = 0; x < w; x += 1) {
    tryAdd(x, 0);
    tryAdd(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    tryAdd(0, y);
    tryAdd(w - 1, y);
  }

  while (queue.length) {
    const i = queue.pop()!;
    const x = i % w;
    const y = (i - x) / w;
    tryAdd(x - 1, y);
    tryAdd(x + 1, y);
    tryAdd(x, y - 1);
    tryAdd(x, y + 1);
  }

  for (let i = 0; i < w * h; i += 1) {
    if (remove[i]) px[i * 4 + 3] = 0;
  }
  ctx.putImageData(frame, 0, 0);
}

function recolorTorso(canvas: HTMLCanvasElement, mask: TorsoMask, fabricHex: string): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const frame = ctx.getImageData(0, 0, w, h);
  const px = frame.data;
  const [tr, tg, tb] = hexToRgb(fabricHex);
  const topY = h * mask.top;
  const bottomY = h * mask.bottom;

  for (let y = 0; y < h; y += 1) {
    if (y < topY || y > bottomY) continue;
    const rowT = (y - topY) / (bottomY - topY);
    const halfW = (w * (mask.widthTop + (mask.widthBottom - mask.widthTop) * rowT)) / 2;
    const cx = w / 2;
    for (let x = Math.floor(cx - halfW); x < Math.ceil(cx + halfW); x += 1) {
      if (x < 0 || x >= w) continue;
      const i = (y * w + x) * 4;
      if (px[i + 3] < 20) continue;
      const lum = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
      const shade = 0.48 + lum * 0.52;
      px[i] = Math.min(255, Math.round(tr * shade));
      px[i + 1] = Math.min(255, Math.round(tg * shade));
      px[i + 2] = Math.min(255, Math.round(tb * shade));
    }
  }
  ctx.putImageData(frame, 0, 0);
}

function trimToAlphaBounds(canvas: HTMLCanvasElement, pad = 4): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 24) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX <= minX || maxY <= minY) return canvas;

  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  const out = document.createElement('canvas');
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext('2d')!.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function removeDarkBackground(canvas: HTMLCanvasElement, threshold = 40): void {
  const ctx = canvas.getContext('2d')!;
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = frame.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] < threshold && px[i + 1] < threshold && px[i + 2] < threshold) {
      px[i + 3] = 0;
    }
  }
  ctx.putImageData(frame, 0, 0);
}

function tintGarmentCanvas(canvas: HTMLCanvasElement, fabricHex: string): void {
  const ctx = canvas.getContext('2d')!;
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = frame.data;
  const [tr, tg, tb] = hexToRgb(fabricHex);

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 20) continue;
    const lum = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
    const shade = 0.55 + lum * 0.45;
    px[i] = Math.min(255, Math.round(tr * shade));
    px[i + 1] = Math.min(255, Math.round(tg * shade));
    px[i + 2] = Math.min(255, Math.round(tb * shade));
  }
  ctx.putImageData(frame, 0, 0);
}

async function loadTintedGarment(
  garmentKey: GarmentKey,
  fabricHex: string,
  customUrl?: string | null,
): Promise<HTMLCanvasElement> {
  const img = await loadImage(customUrl || GARMENT_BASE_SRC[garmentKey]);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  removeDarkBackground(canvas);
  tintGarmentCanvas(canvas, fabricHex);
  return trimToAlphaBounds(canvas);
}

function sourceSize(img: CanvasImageSource): { w: number; h: number } {
  if (img instanceof HTMLImageElement) {
    return { w: img.naturalWidth, h: img.naturalHeight };
  }
  if (img instanceof HTMLCanvasElement) {
    return { w: img.width, h: img.height };
  }
  if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) {
    return { w: img.width, h: img.height };
  }
  return { w: OUT_W, h: OUT_H };
}

function drawContainInBox(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  box: Rect,
): Rect {
  const { w: sw, h: sh } = sourceSize(img);
  const scale = Math.min(box.w / sw, box.h / sh);
  const rw = sw * scale;
  const rh = sh * scale;
  const x = box.x + (box.w - rw) / 2;
  const y = box.y + (box.h - rh) / 2;
  ctx.drawImage(img, x, y, rw, rh);
  return { x, y, w: rw, h: rh };
}

function drawCoverBottom(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  box: Rect,
): Rect {
  const { w: sw, h: sh } = sourceSize(img);
  const scale = Math.max(box.w / sw, box.h / sh);
  const rw = sw * scale;
  const rh = sh * scale;
  const x = box.x + (box.w - rw) / 2;
  const y = box.y + box.h - rh;
  ctx.drawImage(img, x, y, rw, rh);
  return { x, y, w: rw, h: rh };
}

function applyFaceFeather(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h * 0.44;
  const rx = w * 0.4;
  const ry = h * 0.46;

  const mask = document.createElement('canvas');
  mask.width = w;
  mask.height = h;
  const mctx = mask.getContext('2d')!;
  const grad = mctx.createRadialGradient(cx, cy, rx * 0.2, cx, cy, rx);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.82, 'rgba(255,255,255,0.95)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  mctx.fillStyle = grad;
  mctx.beginPath();
  mctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  mctx.fill();

  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
}

function softenFaceBackdrop(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const frame = ctx.getImageData(0, 0, w, h);
  const px = frame.data;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(w, h) * 0.52;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      if (px[i + 3] < 10) continue;
      const dx = (x - cx) / maxR;
      const dy = (y - cy) / maxR;
      const edge = dx * dx + dy * dy;
      if (edge > 1 && !isSkinPixel(px[i], px[i + 1], px[i + 2])) {
        px[i + 3] = 0;
      }
    }
  }
  ctx.putImageData(frame, 0, 0);
}

function extractVisitorFace(
  capture: HTMLImageElement,
  faceBox: FaceRegion | null | undefined,
): HTMLCanvasElement {
  const fb = faceBox ?? { x: 0.28, y: 0.12, width: 0.44, height: 0.42 };
  const padX = fb.width * 0.05;
  const padTop = fb.height * 0.22;
  const padBottom = fb.height * 0.04;
  const left = Math.max(0, (fb.x - padX) * capture.width);
  const top = Math.max(0, (fb.y - padTop) * capture.height);
  const right = Math.min(capture.width, (fb.x + fb.width + padX) * capture.width);
  const bottom = Math.min(capture.height, (fb.y + fb.height + padBottom) * capture.height);

  const cropW = Math.max(1, right - left);
  const cropH = Math.max(1, bottom - top);
  const outW = 480;
  const outH = Math.max(1, Math.round((outW * cropH) / cropW));
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(capture, left, top, cropW, cropH, 0, 0, outW, outH);
  softenFaceBackdrop(canvas);
  applyFaceFeather(canvas);
  return canvas;
}

function eraseModelFace(canvas: HTMLCanvasElement, faceSpec: { top: number; width: number }): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const fW = w * faceSpec.width;
  const fH = fW * 1.2;
  const cx = w / 2;
  const cy = h * faceSpec.top + fH * 0.48;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(cx, cy, fW * 0.54, fH * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintVisitorFace(
  target: CanvasRenderingContext2D,
  layout: Rect,
  capture: HTMLImageElement,
  faceBox: FaceRegion | null | undefined,
  faceSpec: { top: number; width: number },
): void {
  const face = extractVisitorFace(capture, faceBox);
  const fW = layout.w * faceSpec.width;
  const aspect = face.height / face.width;
  const fH = fW * Math.min(1.15, aspect + 0.04);
  const fX = layout.x + (layout.w - fW) / 2;
  const fY = layout.y + layout.h * faceSpec.top;

  target.save();
  target.globalAlpha = 0.98;
  target.drawImage(face, fX, fY, fW, fH);
  target.restore();
}

function drawBackgroundCover(ctx: CanvasRenderingContext2D, bg: HTMLImageElement) {
  const scale = Math.max(OUT_W / bg.width, OUT_H / bg.height);
  const bw = bg.width * scale;
  const bh = bg.height * scale;
  ctx.drawImage(bg, (OUT_W - bw) / 2, (OUT_H - bh) / 2, bw, bh);
}

function portraitBox(): Rect {
  const portraitW = OUT_W * 0.94;
  const portraitH = OUT_H * 0.92;
  return {
    x: (OUT_W - portraitW) / 2,
    y: OUT_H * 0.04,
    w: portraitW,
    h: portraitH,
  };
}

function drawHeritageGarment(
  ctx: CanvasRenderingContext2D,
  garment: HTMLCanvasElement,
  layout: Rect,
  garmentKey: GarmentKey,
): void {
  const neckAnchor = GARMENT_NECK_ANCHOR[garmentKey];
  const modelNeckY = layout.y + layout.h * 0.14;
  const scale = Math.min(layout.w / garment.width, layout.h / garment.height) * 1.04;
  const rw = garment.width * scale;
  const rh = garment.height * scale;
  const gx = layout.x + (layout.w - rw) / 2;
  const gy = modelNeckY - rh * neckAnchor;

  const clipY = layout.y + layout.h * 0.08;
  ctx.save();
  ctx.beginPath();
  ctx.rect(layout.x, clipY, layout.w, layout.y + layout.h - clipY);
  ctx.clip();
  ctx.drawImage(garment, gx, gy, rw, rh);
  ctx.restore();
}

async function composeTryOn(
  bg: HTMLImageElement,
  capture: HTMLImageElement | null,
  faceBox: FaceRegion | null | undefined,
  model: HTMLImageElement,
  garmentKey: GarmentKey,
  fabricHex: string,
  modelGender: ModelGender,
  tryonImageUrl?: string | null,
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d')!;

  drawBackgroundCover(ctx, bg);

  const isHeritage = HERITAGE_GARMENTS.includes(garmentKey);
  const torsoMask: TorsoMask = isHeritage ? TORSO_MASK[garmentKey] : TEMPLATE_TORSO_MASK[garmentKey];
  const faceSpec = isHeritage ? FACE_ON_PORTRAIT[modelGender] : FACE_ON_MODEL[modelGender];

  const portrait = isHeritage ? cropPortraitTop(model) : modelToCanvas(model);
  removeEdgeBackground(portrait, isHeritage ? 46 : 36);

  recolorTorso(portrait, torsoMask, fabricHex);

  if (capture) eraseModelFace(portrait, faceSpec);

  const box = portraitBox();
  const layout = isHeritage
    ? drawCoverBottom(ctx, portrait, box)
    : drawContainInBox(ctx, portrait, box);

  if (isHeritage) {
    const garment = await loadTintedGarment(garmentKey, fabricHex, tryonImageUrl);
    drawHeritageGarment(ctx, garment, layout, garmentKey);
  }

  if (capture) {
    paintVisitorFace(ctx, layout, capture, faceBox, faceSpec);
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

function useTryOnImage(
  captureDataUrl: string | null,
  faceBox: FaceRegion | null | undefined,
  garmentKey: GarmentKey,
  fabricHex: string,
  backgroundId: string,
  gender: string | null | undefined,
  tryonImageUrl?: string | null,
) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const modelGender = modelGenderFromProfile(gender);
    const bgSrc = BACKGROUND_SRC[backgroundId] || BACKGROUND_SRC.studio;
    const modelSrc = tryOnModelSrc(modelGender, garmentKey);

    Promise.all([
      loadImage(bgSrc),
      loadImage(modelSrc).catch(() => loadImage(MODEL_SRC[modelGender])),
    ])
      .then(async ([bg, model]) => {
        if (cancelled) return;
        let capture: HTMLImageElement | null = null;
        if (captureDataUrl) {
          try {
            capture = await loadImage(captureDataUrl);
          } catch {
            capture = null;
          }
        }
        const url = await composeTryOn(
          bg,
          capture,
          faceBox,
          model,
          garmentKey,
          fabricHex,
          modelGender,
          tryonImageUrl,
        );
        if (!cancelled) {
          setImageUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [captureDataUrl, faceBox, garmentKey, fabricHex, backgroundId, gender, tryonImageUrl]);

  return { imageUrl, loading };
}

export function LookComposer({
  captureDataUrl,
  faceBox,
  garmentKey,
  fabricHex,
  backgroundId,
  designName,
  gender,
  tryonImageUrl,
  className = '',
  fullBleed = false,
  fitContain = false,
}: LookComposerProps) {
  const scene = BACKGROUND_SCENES[backgroundId] || BACKGROUND_SCENES.studio;
  const { imageUrl, loading } = useTryOnImage(
    captureDataUrl,
    faceBox,
    garmentKey,
    fabricHex,
    backgroundId,
    gender,
    tryonImageUrl,
  );

  const frameClass = fullBleed
    ? `relative h-full w-full overflow-hidden ${fitContain ? 'bg-slate-200' : 'bg-[#111]'}`
    : `relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-[#111] shadow-kiosk ${className}`;

  return (
    <div className={frameClass}>
      {loading ? (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-sky-50 to-slate-100">
          <motion.div
            className="flex flex-col items-center gap-3"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            <div className="h-12 w-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
            <span className="text-sm font-bold text-muted">Creating your look…</span>
          </motion.div>
        </div>
      ) : imageUrl ? (
        <motion.img
          src={imageUrl}
          alt="Your try-on preview"
          className={
            fitContain
              ? 'h-full w-full object-contain object-center'
              : 'h-full w-full object-cover object-[center_20%]'
          }
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-slate-100 text-sm font-bold text-muted">
          Preview unavailable
        </div>
      )}

      {!fullBleed && (
        <div className="absolute left-3 top-3 z-[4] rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-navy shadow-sm">
          {scene.label}
        </div>
      )}
      {designName && !fullBleed ? (
        <div className="absolute bottom-3 left-3 z-[4] max-w-[85%] truncate rounded-full bg-navy/90 px-3 py-1.5 text-[11px] font-bold text-white shadow">
          {designName}
        </div>
      ) : null}

      {!loading && imageUrl ? (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
