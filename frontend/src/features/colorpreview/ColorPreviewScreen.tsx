import { motion } from 'framer-motion';
import type { PaletteColor } from '../../shared/lib/types';

interface ColorPreviewScreenProps {
  captureDataUrl: string | null;
  selectedColors: PaletteColor[];
  top20: PaletteColor[];
}

export function ColorPreviewScreen({ captureDataUrl, selectedColors, top20 }: ColorPreviewScreenProps) {
  const best = (selectedColors.length ? selectedColors : top20).slice(0, 5);

  return (
    <section className="screen">
      <p className="screen-sub">See how the recommended colors look on you.</p>

      <motion.div
        className="relative mx-auto aspect-[4/5] w-full max-w-[340px] overflow-hidden rounded-3xl bg-slate-200 shadow-kiosk"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {captureDataUrl ? (
          <img
            src={captureDataUrl}
            alt="Your capture"
            className="h-full w-full object-cover object-top"
            draggable={false}
          />
        ) : null}

        <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/95 px-3 py-2.5 shadow-md">
          <p className="mb-1.5 text-center text-[10px] font-extrabold uppercase tracking-wide text-navy">
            Best Colors For You
          </p>
          <div className="flex justify-center gap-1.5">
            {best.map((c) => (
              <span
                key={c.id}
                className="h-9 w-9 rounded-full border-2 border-white shadow ring-1 ring-black/10"
                style={{ background: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
