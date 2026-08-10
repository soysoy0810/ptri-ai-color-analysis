import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { DESIGNS } from '../../data/catalog';
import { DESIGN_GARMENT, GARMENT_SRC, garmentForDesign } from '../../data/garments';

interface DesignScreenProps {
  categoryId: string | null;
  selectedId: string | null;
  onSelect: (designId: string) => void;
}

export function DesignScreen({ categoryId, selectedId, onSelect }: DesignScreenProps) {
  const designs = (categoryId && DESIGNS[categoryId]) || [];

  return (
    <section className="screen">
      <h1 className="screen-title">Select a design you like.</h1>
      <p className="screen-sub">Real garment styles from the approved PTRI catalog.</p>

      <div className="grid grid-cols-2 gap-3">
        {designs.map((design, i) => {
          const key = DESIGN_GARMENT[design.id] || garmentForDesign(design.id);
          const src = GARMENT_SRC[key];
          const active = selectedId === design.id;
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
              <div className="mb-2 flex h-[120px] items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-accent-soft to-white">
                <motion.img
                  src={src}
                  alt={design.name}
                  className="h-[112px] w-auto object-contain drop-shadow-md"
                  draggable={false}
                  whileHover={{ scale: 1.06 }}
                />
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
