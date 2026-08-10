import {
  BriefcaseBusiness,
  Dumbbell,
  Scissors,
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
  fabrics: Scissors,
};

export function CategoryScreen({ selectedId, onSelect }: CategoryScreenProps) {
  return (
    <section className="screen">
      <h1 className="screen-title">What Would You Like to Explore?</h1>
      <p className="screen-sub">Choose a category to see designs and find your perfect style.</p>

      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = ICONS[cat.id] || Shirt;
          return (
            <button
              key={cat.id}
              type="button"
              className={`tile min-h-[120px] ${selectedId === cat.id ? 'active' : ''}`}
              onClick={() => onSelect(cat.id)}
            >
              <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-navy">
                <Icon className="h-5 w-5" />
              </span>
              <strong className="block text-sm font-extrabold uppercase tracking-wide text-navy">
                {cat.label}
              </strong>
              <span className="mt-1 block text-xs text-muted">{cat.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
