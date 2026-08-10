import { motion } from 'framer-motion';
import {
  BriefcaseBusiness,
  Dumbbell,
  Flower2,
  LayoutGrid,
  Shirt,
  Sparkles,
  StretchHorizontal,
} from 'lucide-react';
import { CATEGORIES } from '../../data/catalog';

interface CategoryScreenProps {
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
}

const ICONS: Record<string, typeof Shirt> = {
  filipiniana: Flower2,
  uniform: Shirt,
  casual: StretchHorizontal,
  smart_casual: Sparkles,
  formal: BriefcaseBusiness,
  active: Dumbbell,
  fabrics: LayoutGrid,
};

export function CategoryScreen({ selectedId, onSelect }: CategoryScreenProps) {
  return (
    <section className="screen">
      <h1 className="screen-title">What Would You Like to Explore?</h1>
      <p className="screen-sub">Choose a category to see designs and find your perfect style.</p>

      <div className="mt-1 grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat, i) => {
          const Icon = ICONS[cat.id] || Shirt;
          const active = selectedId === cat.id;
          return (
            <motion.button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className={`flex min-h-[140px] flex-col items-center justify-center rounded-2xl border-2 bg-white p-4 text-center shadow-sm transition ${
                active ? 'border-accent shadow-[0_0_0_3px_rgba(47,128,237,0.15)]' : 'border-line'
              }`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileTap={{ scale: 0.96 }}
            >
              <motion.span
                className={`mb-3 grid h-14 w-14 place-items-center rounded-2xl border ${
                  active ? 'border-accent bg-accent text-white' : 'border-line bg-accent-soft text-accent'
                }`}
                animate={active ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.4 }}
              >
                <Icon className="h-7 w-7" strokeWidth={1.75} />
              </motion.span>
              <strong className="text-[13px] font-extrabold uppercase tracking-wide text-navy">
                {cat.label}
              </strong>
              <span className="mt-1 text-xs font-medium leading-snug text-muted">
                {cat.description}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
