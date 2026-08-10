import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { BACKGROUNDS } from '../../data/catalog';
import { BACKGROUND_SCENES } from '../../data/garments';

interface BackgroundScreenProps {
  selectedId: string;
  onSelect: (backgroundId: string) => void;
}

export function BackgroundScreen({ selectedId, onSelect }: BackgroundScreenProps) {
  return (
    <section className="screen">
      <h1 className="screen-title">Select a background for your look.</h1>

      <div className="grid grid-cols-2 gap-3">
        {BACKGROUNDS.map((bg, i) => {
          const scene = BACKGROUND_SCENES[bg.id];
          const active = selectedId === bg.id;
          return (
            <motion.button
              key={bg.id}
              type="button"
              className={`relative overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition ${
                active ? 'border-accent shadow-[0_0_0_3px_rgba(47,128,237,0.15)]' : 'border-line'
              }`}
              onClick={() => onSelect(bg.id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileTap={{ scale: 0.96 }}
            >
              {active ? (
                <motion.span
                  className="absolute right-2 top-2 z-[1] grid h-7 w-7 place-items-center rounded-full bg-accent text-white shadow"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </motion.span>
              ) : null}

              {/* scene preview */}
              <div
                className="relative h-[88px] w-full"
                style={{
                  background: scene
                    ? `linear-gradient(160deg, ${scene.from} 0%, ${scene.via} 55%, ${scene.to} 100%)`
                    : bg.tone,
                }}
              >
                {/* simple floor line to suggest depth */}
                <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/12 to-transparent" />
              </div>
              <div className="px-3 py-2">
                <strong className="text-sm font-bold text-navy">{bg.label}</strong>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
