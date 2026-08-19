import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { getDesignsForCategory, resolvePreviewUrl } from '../../shared/lib/catalogStore';

interface DesignScreenProps {
  categoryId: string | null;
  selectedId: string | null;
  /** Visitor's gender from the profile step — used to rank AI suggestions */
  gender?: string;
  onSelect: (designId: string) => void;
}

export function DesignScreen({ categoryId, selectedId, gender, onSelect }: DesignScreenProps) {
  const all = categoryId ? getDesignsForCategory(categoryId) : [];
  const knownGender = gender === 'male' || gender === 'female';
  const visible = knownGender
    ? all.filter((d) => !d.audience || d.audience === 'unisex' || d.audience === gender)
    : all;
  const designs = knownGender
    ? [...visible].sort((a, b) => rank(a.audience, gender) - rank(b.audience, gender))
    : visible;

  return (
    <section className="screen">
      <p className="screen-sub">
        {knownGender
          ? 'AI sorted these styles for you — tap the outfit you want to wear.'
          : 'Tap a garment photo to try it on in the next step.'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {designs.map((design, i) => {
          const src = resolvePreviewUrl(design.id) || '';
          const active = selectedId === design.id;
          const aiPick = knownGender && design.audience === gender;
          return (
            <motion.button
              key={design.id}
              type="button"
              className={`relative overflow-hidden rounded-2xl border-2 bg-white p-2 text-left shadow-sm transition ${
                active ? 'border-accent shadow-[0_0_0_3px_rgba(47,128,237,0.15)]' : 'border-line'
              }`}
              onClick={() => onSelect(design.id)}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileTap={{ scale: 0.97 }}
            >
              {active ? (
                <motion.span
                  className="absolute right-2.5 top-2.5 z-[1] grid h-7 w-7 place-items-center rounded-full bg-accent text-white shadow"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </motion.span>
              ) : null}
              {aiPick ? (
                <motion.span
                  className="absolute left-2.5 top-2.5 z-[1] flex items-center gap-1 rounded-full bg-navy px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-white shadow"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.07 }}
                >
                  <Sparkles className="h-3 w-3 text-sky-300" />
                  AI Pick
                </motion.span>
              ) : null}
              <div className="mb-2 flex h-[120px] items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-accent-soft to-white">
                {src ? (
                  <motion.img
                    src={src}
                    alt={design.name}
                    className="h-[112px] w-auto object-contain drop-shadow-md"
                    draggable={false}
                    whileHover={{ scale: 1.06 }}
                  />
                ) : (
                  <span className="text-xs font-bold text-muted">No photo yet</span>
                )}
              </div>
              <strong className="block text-sm font-bold text-navy">{design.name}</strong>
              <span className="text-xs text-muted">Style {design.style}</span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

function rank(audience: string | undefined, gender: string | undefined): number {
  if (audience === gender) return 0;
  if (audience === 'unisex' || !audience) return 1;
  return 2;
}
