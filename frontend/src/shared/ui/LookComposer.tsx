import { useEffect, useState } from 'react';
import {
  BACKGROUND_SCENES,
  BACKGROUND_SRC,
  GARMENT_BASE_SRC,
  HEAD_ANCHOR,
  type GarmentKey,
} from '../../data/garments';
import type { FaceRegion } from '../lib/types';

interface LookComposerProps {
  captureDataUrl: string | null;
  faceBox?: FaceRegion | null;
  garmentKey: GarmentKey;
  fabricHex: string;
  backgroundId: string;
  designName?: string;
  className?: string;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Average RGB of a rectangular patch of image data */
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

/**
 * Cut the visitor's head + neck out of the captured frame with the camera
 * background removed, so the face is truly transparent around the edges and
 * looks worn on the garment instead of pasted over it.
 */
function useHeadCrop(captureDataUrl: string | null, faceBox: FaceRegion | null | undefined) {
  const [headUrl, setHeadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!captureDataUrl) {
      setHeadUrl(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      // Fall back to a centered guess when no face box was stored
      const fb = faceBox ?? { x: 0.32, y: 0.12, width: 0.36, height: 0.42 };

      // Crop window: hair above the face box, neck below it
      const left = Math.max(0, (fb.x - fb.width * 0.3) * img.width);
      const top = Math.max(0, (fb.y - fb.height * 0.45) * img.height);
      const right = Math.min(img.width, (fb.x + fb.width * 1.3) * img.width);
      const bottom = Math.min(img.height, (fb.y + fb.height * 1.5) * img.height);
      const sw = right - left;
      const sh = bottom - top;
      if (sw <= 0 || sh <= 0) return;

      const size = 480;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = Math.round((size * sh) / sw);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, left, top, sw, sh, 0, 0, canvas.width, canvas.height);

      const W = canvas.width;
      const H = canvas.height;
      const frame = ctx.getImageData(0, 0, W, H);
      const px = frame.data;

      // Estimate the camera background from the top corners of the crop
      const bgL = patchAverage(px, W, 2, 2, Math.round(W * 0.14), Math.round(H * 0.2));
      const bgR = patchAverage(px, W, Math.round(W * 0.86), 2, W - 2, Math.round(H * 0.2));
      // Estimate the visitor's skin from the center of the face
      const skin = patchAverage(
        px,
        W,
        Math.round(W * 0.38),
        Math.round(H * 0.34),
        Math.round(W * 0.62),
        Math.round(H * 0.52),
      );

      // Feathered ellipse around head + neck, then color-based background removal
      const ecx = W * 0.5;
      const ecy = H * 0.4;
      const erx = W * 0.5;
      const ery = H * 0.52;

      for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
          const i = (y * W + x) * 4;
          const r = px[i];
          const g = px[i + 1];
          const b = px[i + 2];

          const dBgL = Math.abs(r - bgL[0]) + Math.abs(g - bgL[1]) + Math.abs(b - bgL[2]);
          const dBgR = Math.abs(r - bgR[0]) + Math.abs(g - bgR[1]) + Math.abs(b - bgR[2]);
          const dBg = Math.min(dBgL, dBgR);
          const dSkin = Math.abs(r - skin[0]) + Math.abs(g - skin[1]) + Math.abs(b - skin[2]);

          // Away from background color → keep; close to skin → always keep
          const keepColor = smoothstep(28, 80, dBg);
          const keepSkin = 1 - smoothstep(55, 130, dSkin);
          const keep = Math.max(keepColor, keepSkin);

          // Feathered ellipse bound so stray far pixels never survive
          const nx = (x - ecx) / erx;
          const ny = (y - ecy) / ery;
          const rad = Math.sqrt(nx * nx + ny * ny);
          const ellipse = 1 - smoothstep(0.82, 1, rad);

          px[i + 3] = Math.round(px[i + 3] * keep * ellipse);
        }
      }

      ctx.putImageData(frame, 0, 0);
      setHeadUrl(canvas.toDataURL('image/png'));
    };
    img.src = captureDataUrl;
    return () => {
      cancelled = true;
    };
  }, [captureDataUrl, faceBox]);

  return headUrl;
}

/**
 * Try-on composer: real photo scene + cutout garment recolored to the
 * selected fabric + the visitor's own head sitting on the collar.
 */
export function LookComposer({
  captureDataUrl,
  faceBox,
  garmentKey,
  fabricHex,
  backgroundId,
  designName,
  className = '',
}: LookComposerProps) {
  const scene = BACKGROUND_SCENES[backgroundId] || BACKGROUND_SCENES.studio;
  const sceneSrc = BACKGROUND_SRC[backgroundId] || BACKGROUND_SRC.studio;
  const garmentSrc = GARMENT_BASE_SRC[garmentKey];
  const anchor = HEAD_ANCHOR[garmentKey] || HEAD_ANCHOR.polo;
  const headUrl = useHeadCrop(captureDataUrl, faceBox);

  const garmentMask: React.CSSProperties = {
    WebkitMaskImage: `url(${garmentSrc})`,
    maskImage: `url(${garmentSrc})`,
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center bottom',
    maskPosition: 'center bottom',
  };

  return (
    <div className={`relative min-h-[420px] overflow-hidden rounded-3xl shadow-kiosk ${className}`}>
      {/* Real photo environment */}
      <img
        src={sceneSrc}
        alt={scene.label}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {/* Gentle darkening at the bottom to ground the subject */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />

      {/* Soft contact shadow behind the person */}
      <div className="absolute bottom-[-4%] left-1/2 z-[1] h-[70%] w-[80%] -translate-x-1/2 rounded-[45%] bg-black/25 blur-2xl" />

      {/* Garment — real cutout photo, tinted to the selected fabric */}
      <div className="absolute bottom-[-3%] left-1/2 z-[2] h-[68%] w-[86%] -translate-x-1/2">
        <img
          src={garmentSrc}
          alt={designName || 'Selected garment'}
          className="h-full w-full object-contain object-bottom"
          draggable={false}
        />
        {/* Fabric color applied only on garment pixels via alpha mask */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ ...garmentMask, background: fabricHex, mixBlendMode: 'multiply' }}
          aria-hidden
        />
        {/* Restore highlights so folds stay visible on dark fabrics */}
        <img
          src={garmentSrc}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-contain object-bottom opacity-30"
          style={{ mixBlendMode: 'soft-light' }}
          draggable={false}
        />
      </div>

      {/* Visitor's head + neck — background removed so it reads as truly worn.
          Rendered behind the garment so the neck tucks into the collar. */}
      {headUrl ? (
        <img
          src={headUrl}
          alt="Your face"
          className="absolute left-1/2 z-[1] -translate-x-1/2"
          style={{
            bottom: `${anchor.bottom - 6}%`,
            width: `${anchor.width}%`,
            filter: 'drop-shadow(0 8px 14px rgba(11,31,58,0.3))',
          }}
          draggable={false}
        />
      ) : (
        <div className="absolute bottom-[60%] left-1/2 z-[3] grid aspect-square w-[34%] -translate-x-1/2 place-items-center rounded-full bg-slate-200/80 text-xs font-bold text-muted">
          Face capture
        </div>
      )}

      {/* Labels */}
      <div className="absolute left-3 top-3 z-[4] rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-navy shadow-sm">
        {scene.label}
      </div>
      {designName ? (
        <div className="absolute bottom-3 left-1/2 z-[4] max-w-[90%] -translate-x-1/2 truncate rounded-full bg-navy/90 px-3 py-1.5 text-center text-[11px] font-bold text-white shadow">
          {designName}
        </div>
      ) : null}
    </div>
  );
}
