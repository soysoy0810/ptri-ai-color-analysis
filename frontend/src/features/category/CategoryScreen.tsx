import {
  BriefcaseBusiness,
  Dumbbell,
  Layers,
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
  uniform: Shirt,
  casual: StretchHorizontal,
  smart_casual: Sparkles,
  formal: BriefcaseBusiness,
  active: Dumbbell,
  fabrics: Layers,
};

export function CategoryScreen({ selectedId, onSelect }: CategoryScreenProps) {
  return (
    <section className="screen">
      <h1 className="screen-title">What Would You Like to Explore?</h1>
      <p className="screen-sub">Choose a category to see designs and find your perfect style.</p>

      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = ICONS[cat.id] || Shirt;
          const active = selectedId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className={`flex min-h-[132px] flex-col items-start rounded-2xl border-2 bg-white p-4 text-left transition active:scale-[0.985] ${
                active ? 'border-accent shadow-[0_0_0_3px_rgba(47,128,237,0.15)]' : 'border-line'
              }`}
            >
              <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl border border-line text-navy">
                <Icon className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <strong className="text-[13px] font-extrabold uppercase tracking-wide text-navy">
                {cat.label}
              </strong>
              <span className="mt-1 text-xs font-medium text-muted">{cat.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
