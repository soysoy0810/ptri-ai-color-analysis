import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BACKGROUND_SCENES,
  BACKGROUND_SRC,
  FACE_ON_MODEL,
  GARMENT_BASE_SRC,
  GARMENT_ON_MODEL,
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

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function patchAverage(
  data: Uint8ClampedArray,
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * width + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n += 1;
    }
  }
  return n ? [r / n, g / n, b / n] : [128, 128, 128];
}

/** Cut visitor face from the camera capture with background removed */
function cropVisitorFace(
  img: HTMLImageElement,
  faceBox: FaceRegion | null | undefined,
): HTMLCanvasElement {
  const fb = faceBox ?? { x: 0.32, y: 0.12, width: 0.36, height: 0.42 };
  const left = Math.max(0, (fb.x - fb.width * 0.25) * img.width);
  const top = Math.max(0, (fb.y - fb.height * 0.5) * img.height);
  const right = Math.min(img.width, (fb.x + fb.width * 1.25) * img.width);
  const bottom = Math.min(img.height, (fb.y + fb.height * 1.35) * img.height);
  const sw = right - left;
  const sh = bottom - top;

  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = Math.max(1, Math.round((420 * sh) / sw));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, left, top, sw, sh, 0, 0, canvas.width, canvas.height);

  const W = canvas.width;
  const H = canvas.height;
  const frame = ctx.getImageData(0, 0, W, H);
  const px = frame.data;
  const bgL = patchAverage(px, W, 2, 2, Math.round(W * 0.14), Math.round(H * 0.18));
  const bgR = patchAverage(px, W, Math.round(W * 0.86), 2, W - 2, Math.round(H * 0.18));
  const skin = patchAverage(px, W, Math.round(W * 0.35), Math.round(H * 0.3), Math.round(W * 0.65), Math.round(H * 0.55));

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      const dBg = Math.min(
        Math.abs(r - bgL[0]) + Math.abs(g - bgL[1]) + Math.abs(b - bgL[2]),
        Math.abs(r - bgR[0]) + Math.abs(g - bgR[1]) + Math.abs(b - bgR[2]),
      );
      const dSkin = Math.abs(r - skin[0]) + Math.abs(g - skin[1]) + Math.abs(b - skin[2]);
      const keep = Math.max(smoothstep(28, 78, dBg), 1 - smoothstep(50, 125, dSkin));
      const nx = (x - W * 0.5) / (W * 0.48);
      const ny = (y - H * 0.42) / (H * 0.5);
      const ellipse = 1 - smoothstep(0.85, 1, Math.sqrt(nx * nx + ny * ny));
      px[i + 3] = Math.round(px[i + 3] * keep * ellipse);
    }
  }
  ctx.putImageData(frame, 0, 0);
  return canvas;
}

/** Tint a garment base PNG to the selected fabric color */
function tintGarment(garmentImg: HTMLImageElement, fabricHex: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = garmentImg.width;
  c.height = garmentImg.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(garmentImg, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = fabricHex;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(garmentImg, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.28;
  ctx.drawImage(garmentImg, 0, 0);
  ctx.globalAlpha = 1;
  return c;
}

/** Build one photoreal try-on: background + standing model + tinted garment + visitor face */
function composeTryOn(
  bg: HTMLImageElement,
  model: HTMLImageElement,
  garmentTinted: HTMLCanvasElement,
  faceCrop: HTMLCanvasElement | null,
  garmentKey: GarmentKey,
  modelGender: ModelGender,
): string {
  const W = 720;
  const H = 900;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background — cover crop
  const bgScale = Math.max(W / bg.width, H / bg.height);
  const bw = bg.width * bgScale;
  const bh = bg.height * bgScale;
  ctx.drawImage(bg, (W - bw) / 2, (H - bh) / 2, bw, bh);

  // Soft vignette
  const vig = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H * 0.45, H * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Full-body model — standing, hands visible
  const modelH = H * 0.9;
  const modelW = modelH * (model.width / model.height);
  const modelX = (W - modelW) / 2;
  const modelY = H - modelH;

  // Ground shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(W / 2, H - 8, modelW * 0.28, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.drawImage(model, modelX, modelY, modelW, modelH);

  // Tinted garment on the model torso
  const gSpec = GARMENT_ON_MODEL[garmentKey] || GARMENT_ON_MODEL.polo;
  const gW = modelW * gSpec.width;
  const gH = gW * (garmentTinted.height / garmentTinted.width);
  const gX = modelX + (modelW - gW) / 2;
  const gY = modelY + modelH * gSpec.top;
  ctx.drawImage(garmentTinted, gX, gY, gW, gH);

  // Visitor face on the model head — covers the stock model face
  if (faceCrop) {
    const fSpec = FACE_ON_MODEL[modelGender];
    const fW = modelW * fSpec.width;
    const fH = fW * (faceCrop.height / faceCrop.width);
    const fX = modelX + (modelW - fW) / 2;
    const fY = modelY + modelH * fSpec.top;

    // Soft oval mask so the face blends into the model neck
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(fX + fW / 2, fY + fH * 0.46, fW * 0.46, fH * 0.48, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(faceCrop, fX, fY, fW, fH);
    ctx.restore();
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
) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const modelGender = modelGenderFromProfile(gender);
    const bgSrc = BACKGROUND_SRC[backgroundId] || BACKGROUND_SRC.studio;
    const garmentSrc = GARMENT_BASE_SRC[garmentKey];
    const modelSrc = MODEL_SRC[modelGender];

    Promise.all([loadImage(bgSrc), loadImage(modelSrc), loadImage(garmentSrc)])
      .then(async ([bg, model, garmentBase]) => {
        if (cancelled) return;
        let faceCrop: HTMLCanvasElement | null = null;
        if (captureDataUrl) {
          const capture = await loadImage(captureDataUrl);
          faceCrop = cropVisitorFace(capture, faceBox);
        }
        const tinted = tintGarment(garmentBase, fabricHex);
        const url = composeTryOn(bg, model, tinted, faceCrop, garmentKey, modelGender);
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
  }, [captureDataUrl, faceBox, garmentKey, fabricHex, backgroundId, gender]);

  return { imageUrl, loading };
}

/**
 * AI try-on preview: full-body standing model wearing the selected garment
 * in the chosen scene, with the visitor's own face blended on naturally.
 */
export function LookComposer({
  captureDataUrl,
  faceBox,
  garmentKey,
  fabricHex,
  backgroundId,
  designName,
  gender,
  className = '',
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

  return (
    <div className={`relative min-h-[420px] overflow-hidden rounded-3xl shadow-kiosk ${className}`}>
      {loading ? (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-100 to-slate-200">
          <motion.div
            className="flex flex-col items-center gap-3"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            <div className="h-12 w-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
            <span className="text-sm font-bold text-muted">AI is composing your look…</span>
          </motion.div>
        </div>
      ) : imageUrl ? (
        <motion.img
          src={imageUrl}
          alt="Your try-on preview"
          className="h-full w-full object-cover"
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-slate-100 text-sm font-bold text-muted">
          Preview unavailable
        </div>
      )}

      <div className="absolute left-3 top-3 z-[4] rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-navy shadow-sm">
        {scene.label}
      </div>
      {designName ? (
        <div className="absolute bottom-3 left-1/2 z-[4] max-w-[90%] -translate-x-1/2 truncate rounded-full bg-navy/90 px-3 py-1.5 text-center text-[11px] font-bold text-white shadow">
          {designName}
        </div>
      ) : null}

      {/* Subtle AI scan shimmer */}
      {!loading && imageUrl ? (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
