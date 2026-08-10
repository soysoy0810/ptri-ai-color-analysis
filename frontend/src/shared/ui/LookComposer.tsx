import { BACKGROUND_SCENES, GARMENT_SRC, type GarmentKey } from '../../data/garments';

interface LookComposerProps {
  captureDataUrl: string | null;
  garmentKey: GarmentKey;
  fabricHex: string;
  backgroundId: string;
  designName?: string;
  className?: string;
}

/**
 * Try-on composer: scene + photoreal garment (recolored) + user face.
 */
export function LookComposer({
  captureDataUrl,
  garmentKey,
  fabricHex,
  backgroundId,
  designName,
  className = '',
}: LookComposerProps) {
  const scene = BACKGROUND_SCENES[backgroundId] || BACKGROUND_SCENES.studio;
  const garmentSrc = GARMENT_SRC[garmentKey];

  return (
    <div className={`relative min-h-[360px] overflow-hidden rounded-3xl shadow-kiosk ${className}`}>
      {/* Environment */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(165deg, ${scene.from} 0%, ${scene.via} 48%, ${scene.to} 100%)`,
        }}
      />
      {/* Soft depth / bokeh */}
      <div className="absolute -left-8 top-10 h-40 w-40 rounded-full bg-white/30 blur-3xl" />
      <div className="absolute -right-10 bottom-16 h-48 w-48 rounded-full bg-navy/10 blur-3xl" />

      {/* Garment plate — colorized to selected fabric */}
      <div className="absolute bottom-[-2%] left-1/2 z-[1] h-[72%] w-[88%] -translate-x-1/2">
        <div
          className="absolute inset-0 rounded-[28px]"
          style={{ background: fabricHex }}
          aria-hidden
        />
        <img
          src={garmentSrc}
          alt={designName || 'Selected garment'}
          className="relative z-[1] h-full w-full object-contain object-bottom drop-shadow-2xl"
          style={{
            filter: 'grayscale(1) contrast(1.08) brightness(1.12)',
            mixBlendMode: 'multiply',
          }}
          draggable={false}
        />
        {/* Keep fabric highlights readable on dark colors */}
        <img
          src={garmentSrc}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2] h-full w-full object-contain object-bottom opacity-35"
          style={{ mixBlendMode: 'soft-light' }}
          draggable={false}
        />
      </div>

      {/* User face — sits on the collar / neckline */}
      <div className="absolute left-1/2 top-[4%] z-[3] w-[46%] -translate-x-1/2">
        <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full border-[5px] border-white shadow-[0_12px_28px_rgba(11,31,58,0.28)]">
          {captureDataUrl ? (
            <img
              src={captureDataUrl}
              alt="Your face"
              className="h-full w-full object-cover"
              style={{ objectPosition: 'center 20%' }}
            />
          ) : (
            <div className="grid h-full place-items-center bg-slate-200 text-xs font-bold text-muted">
              Face capture
            </div>
          )}
        </div>
      </div>

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
