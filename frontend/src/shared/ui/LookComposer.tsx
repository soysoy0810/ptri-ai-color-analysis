import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BACKGROUND_SCENES,
  BACKGROUND_SRC,
  MODEL_SRC,
  modelGenderFromProfile,
  type GarmentKey,
  type ModelGender,
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
  className?: string;
  /** Edge-to-edge kiosk hero — no rounded frame */
  fullBleed?: boolean;
  /** Show the full composed frame without cropping (results strip) */
  fitContain?: boolean;
}

const OUT_W = 720;
const OUT_H = 900;
const BUST_CROP = 0.62;

const FACE_ON_BUST: Record<ModelGender, { top: number; width: number }> = {
  female: { top: 0.05, width: 0.32 },
  male: { top: 0.048, width: 0.31 },
};

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

function isSkin(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return r > 50 && g > 28 && b > 12 && r >= g - 15 && max - min > 8;
}

function cropModelBust(model: HTMLImageElement): HTMLCanvasElement {
  const cropH = Math.round(model.height * BUST_CROP);
  const canvas = document.createElement('canvas');
  canvas.width = model.width;
  canvas.height = cropH;
  canvas.getContext('2d')!.drawImage(model, 0, 0, model.width, cropH, 0, 0, model.width, cropH);
  return canvas;
}

function removeEdgeBackground(canvas: HTMLCanvasElement): void {
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
    if (colorDist(px[pi], px[pi + 1], px[pi + 2], bg) < 40) {
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

/** Erase stock model face so only the visitor face shows — no double face */
function eraseModelFace(bust: HTMLCanvasElement, gender: ModelGender): void {
  const ctx = bust.getContext('2d')!;
  const w = bust.width;
  const h = bust.height;
  const spec = FACE_ON_BUST[gender];
  const cx = w / 2;
  const cy = h * (spec.top + spec.width * 0.55);
  const rx = w * spec.width * 0.5;
  const ry = w * spec.width * 0.56;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function tintModelShirt(canvas: HTMLCanvasElement, fabricHex: string): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const frame = ctx.getImageData(0, 0, w, h);
  const px = frame.data;
  const [tr, tg, tb] = hexToRgb(fabricHex);

  for (let y = Math.round(h * 0.34); y < Math.round(h * 0.88); y += 1) {
    for (let x = Math.round(w * 0.14); x < Math.round(w * 0.86); x += 1) {
      const i = (y * w + x) * 4;
      if (px[i + 3] < 30) continue;
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      if (isSkin(r, g, b)) continue;
      if (r + g + b < 55) continue;
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const mix = 0.65;
      px[i] = Math.round(tr * lum * mix + r * (1 - mix));
      px[i + 1] = Math.round(tg * lum * mix + g * (1 - mix));
      px[i + 2] = Math.round(tb * lum * mix + b * (1 - mix));
    }
  }
  ctx.putImageData(frame, 0, 0);
}

function extractVisitorFace(
  capture: HTMLImageElement,
  faceBox: FaceRegion | null | undefined,
): HTMLCanvasElement {
  const fb = faceBox ?? { x: 0.28, y: 0.1, width: 0.44, height: 0.5 };
  const left = Math.max(0, (fb.x - fb.width * 0.12) * capture.width);
  const top = Math.max(0, (fb.y - fb.height * 0.28) * capture.height);
  const right = Math.min(capture.width, (fb.x + fb.width * 1.12) * capture.width);
  const bottom = Math.min(capture.height, (fb.y + fb.height * 1.05) * capture.height);

  const outW = 420;
  const outH = Math.max(1, Math.round((outW * (bottom - top)) / (right - left)));
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(capture, left, top, right - left, bottom - top, 0, 0, outW, outH);
  return canvas;
}

function drawBackgroundCover(ctx: CanvasRenderingContext2D, bg: HTMLImageElement) {
  const scale = Math.max(OUT_W / bg.width, OUT_H / bg.height);
  const bw = bg.width * scale;
  const bh = bg.height * scale;
  ctx.drawImage(bg, (OUT_W - bw) / 2, (OUT_H - bh) / 2, bw, bh);
}

function composeTryOn(
  bg: HTMLImageElement,
  capture: HTMLImageElement | null,
  faceBox: FaceRegion | null | undefined,
  model: HTMLImageElement,
  fabricHex: string,
  modelGender: ModelGender,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d')!;

  drawBackgroundCover(ctx, bg);

  const bust = cropModelBust(model);
  removeEdgeBackground(bust);
  tintModelShirt(bust, fabricHex);
  if (capture) eraseModelFace(bust, modelGender);

  const bustH = OUT_H * 0.96;
  const bustW = bustH * (bust.width / bust.height);
  const bustX = (OUT_W - bustW) / 2;
  const bustY = OUT_H - bustH;

  ctx.drawImage(bust, bustX, bustY, bustW, bustH);

  if (capture) {
    const face = extractVisitorFace(capture, faceBox);
    const spec = FACE_ON_BUST[modelGender];
    const fW = bustW * spec.width;
    const fH = fW * (face.height / face.width);
    const fX = bustX + (bustW - fW) / 2;
    const fY = bustY + bustH * spec.top;
    ctx.drawImage(face, fX, fY, fW, fH);
  }

  return canvas.toDataURL('image/jpeg', 0.93);
}

function useTryOnImage(
  captureDataUrl: string | null,
  faceBox: FaceRegion | null | undefined,
  _garmentKey: GarmentKey,
  fabricHex: string,
  backgroundId: string,
  gender: string | null | undefined,
) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const modelGender = modelGenderFromProfile(gender);
    const bgSrc = BACKGROUND_SRC[backgroundId] || BACKGROUND_SRC.studio;
    const modelSrc = MODEL_SRC[modelGender];

    Promise.all([loadImage(bgSrc), loadImage(modelSrc)])
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
        const url = composeTryOn(bg, capture, faceBox, model, fabricHex, modelGender);
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
  }, [captureDataUrl, faceBox, fabricHex, backgroundId, gender]);

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
              : 'h-full w-full object-cover object-center'
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
