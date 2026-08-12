import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { BACKGROUNDS, CATEGORIES, FABRICS } from '../../data/catalog';
import { BACKGROUND_SRC } from '../../data/garments';
import { getDesignById, resolveGarmentKey, resolveTryonUrl } from '../../shared/lib/catalogStore';
import type { FaceRegion, PaletteColor } from '../../shared/lib/types';
import { DostPtriLogo } from '../../shared/ui/DostPtriLogo';
import { LookComposer } from '../../shared/ui/LookComposer';

interface PreviewScreenProps {
  captureDataUrl: string | null;
  faceBox: FaceRegion | null;
  gender: string;
  categoryId: string | null;
  designId: string | null;
  backgroundId: string;
  fabricId: string | null;
  selectedColors: PaletteColor[];
  onBackgroundSelect: (backgroundId: string) => void;
}

/**
 * Kiosk-style preview like the DNA Heritage booth in the reference video:
 * scene thumbnails on top, full-screen try-on hero, info bar at bottom.
 */
export function PreviewScreen({
  captureDataUrl,
  faceBox,
  gender,
  categoryId,
  designId,
  backgroundId,
  fabricId,
  selectedColors,
  onBackgroundSelect,
}: PreviewScreenProps) {
  const fabric = FABRICS.find((f) => f.id === fabricId);
  const garmentColor = fabric?.hex || selectedColors[0]?.hex || '#1E4D8C';
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const design = getDesignById(designId);
  const garmentKey = resolveGarmentKey(designId);
  const tryonImageUrl = resolveTryonUrl(designId);

  return (
    <section className="-mx-5 -mt-4 flex h-full min-h-0 flex-col overflow-hidden">
      {/* Top strip — tap scenes like the reference kiosk costume row */}
      <div className="shrink-0 bg-gradient-to-b from-sky-100 to-sky-50/80 px-3 pb-2.5 pt-1">
        <p className="mb-2 text-center text-[10px] font-extrabold uppercase tracking-[0.14em] text-navy/70">
          Tap a scene
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {BACKGROUNDS.map((bg, i) => {
            const active = backgroundId === bg.id;
            const thumb = BACKGROUND_SRC[bg.id];
            return (
              <motion.button
                key={bg.id}
                type="button"
                onClick={() => onBackgroundSelect(bg.id)}
                className={`relative shrink-0 overflow-hidden rounded-xl border-2 transition ${
                  active ? 'border-accent shadow-md' : 'border-white/80 opacity-85'
                }`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.94 }}
              >
                <img src={thumb} alt={bg.label} className="h-14 w-14 object-cover" draggable={false} />
                {active ? (
                  <span className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-accent text-white">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Full-screen hero try-on — fills the kiosk like the reference video */}
      <motion.div
        className="relative min-h-0 flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <LookComposer
          fullBleed
          captureDataUrl={captureDataUrl}
          faceBox={faceBox}
          gender={gender}
          garmentKey={garmentKey}
          fabricHex={garmentColor}
          backgroundId={backgroundId}
          designName={design?.name}
          tryonImageUrl={tryonImageUrl}
        />
      </motion.div>

      {/* Bottom info bar — fabric + design + PTRI */}
      <motion.div
        className="flex shrink-0 items-center gap-3 border-t border-line/80 bg-white px-4 py-2.5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <DostPtriLogo className="h-8 w-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-extrabold text-navy">{design?.name || 'Your Look'}</p>
          <p className="truncate text-[10px] font-semibold text-muted">
            {category?.label} · {fabric ? `PTRI ${fabric.code}` : 'PTRI Fabric'}
          </p>
        </div>
        <span
          className="h-9 w-9 shrink-0 rounded-full border-2 border-white shadow-md ring-1 ring-black/10"
          style={{ background: garmentColor }}
          title={fabric?.name}
        />
      </motion.div>
    </section>
  );
}
