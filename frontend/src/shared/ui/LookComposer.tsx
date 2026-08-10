import { useEffect, useState } from 'react';
import { BACKGROUND_SCENES, BACKGROUND_SRC, GARMENT_BASE_SRC, type GarmentKey } from '../../data/garments';
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

/**
 * Crop the visitor's head out of the captured frame using the detected face
 * box, with a feathered oval alpha so it blends onto the garment collar.
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
      const cx = (fb.x + fb.width / 2) * img.width;
      const cy = (fb.y + fb.height / 2) * img.height;
      // Expand to include hair and chin
      const w = fb.width * img.width * 1.45;
      const h = fb.height * img.height * 1.7;
      const sx = Math.max(0, cx - w / 2);
      const sy = Math.max(0, cy - h * 0.52);
      const sw = Math.min(w, img.width - sx);
      const sh = Math.min(h, img.height - sy);

      const size = 420;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = Math.round((size * sh) / sw);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      // Feathered oval alpha so the crop melts into the scene
      // Tight feathered ellipse so no background survives around the head
      ctx.globalCompositeOperation = 'destination-in';
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height * 0.47);
      ctx.scale(1, canvas.height / canvas.width);
      const mask = ctx.createRadialGradient(0, 0, canvas.width * 0.2, 0, 0, canvas.width * 0.38);
      mask.addColorStop(0, 'rgba(0,0,0,1)');
      mask.addColorStop(0.55, 'rgba(0,0,0,1)');
      mask.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mask;
      ctx.fillRect(-canvas.width, (-canvas.height * canvas.width) / canvas.height, canvas.width * 2, (canvas.height * canvas.width) / canvas.height * 2);
      ctx.restore();

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

      {/* Visitor's head — feathered crop sitting on the collar */}
      {headUrl ? (
        <img
          src={headUrl}
          alt="Your face"
          className="absolute bottom-[49.5%] left-1/2 z-[3] w-[32%] -translate-x-1/2 drop-shadow-[0_10px_18px_rgba(11,31,58,0.35)]"
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
