import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { explainColorFit, type SkinProfile } from '../../shared/lib/colorEngine';
import type { PaletteColor, SelectionMode } from '../../shared/lib/types';

interface Top20ScreenProps {
  colors: PaletteColor[];
  skinProfile?: SkinProfile | null;
  onPickMode: (mode: SelectionMode) => void;
}

export function Top20Screen({ colors, skinProfile = null, onPickMode }: Top20ScreenProps) {
  const [picked, setPicked] = useState(0);
  const top5 = colors.slice(0, 5);
  const pickedColor = top5[picked];

  return (
    <section className="screen">
      <span className="ai-chip mb-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
        Harmony model
      </span>
      <p className="screen-sub">
        Based on camera-based skin analysis, here are colors ranked by contrast and undertone harmony.
      </p>

      <div className="rounded-2xl border border-sky-100 bg-white/90 p-3 shadow-ai-soft">
        <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wide text-muted">
          Top 20 Colors For You
        </p>
        <div className="grid grid-cols-5 gap-2">
          {colors.slice(0, 20).map((color, i) => (
            <motion.div
              key={color.id}
              className="aspect-[5/4] rounded-lg shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
              style={{ background: color.hex }}
              title={color.name}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02, type: 'spring', stiffness: 260, damping: 18 }}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-white p-4 shadow-sm">
        <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-muted">
          Top 5 Colors For You
        </p>
        <div className="flex justify-between gap-2">
          {top5.map((color, i) => (
            <button
              key={color.id}
              type="button"
              className="relative"
              onClick={() => {
                setPicked(i);
                onPickMode('top5');
              }}
            >
              <motion.span
                className={`block h-14 w-14 rounded-full border-2 shadow-md ring-1 ring-black/10 ${
                  picked === i ? 'border-navy' : 'border-white'
                }`}
                style={{ background: color.hex }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + i * 0.06, type: 'spring', stiffness: 260 }}
              />
              {picked === i ? (
                <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-navy text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              ) : null}
            </button>
          ))}
        </div>
        {pickedColor ? (
          <p className="mt-3 text-[11px] font-semibold leading-snug text-navy">
            {explainColorFit(pickedColor, skinProfile)}
          </p>
        ) : null}
      </div>
    </section>
  );
}
