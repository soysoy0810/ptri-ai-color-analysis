import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { ACCESSORY_ITEMS } from '../../data/catalog';
import { featuredLookIdsFor } from '../../data/garments';
import { designsForVisitor, getDesignById, resolvePreviewUrl } from '../../shared/lib/catalogStore';
import { AccessorySwatch } from '../../shared/ui/AccessorySwatch';
const MODEL_FALLBACK = `${import.meta.env.BASE_URL}models/template-female-studio.png`;

interface CategoryScreenProps {
  selectedId: string | null;
  selectedDesignId: string | null;
  selectedAccessories: string[];
  gender?: string;
  onSelect: (categoryId: string) => void;
  onSelectDesign: (designId: string, categoryId: string) => void;
  onToggleAccessory: (itemId: string) => void;
}

const FILTERS: Array<{ id: string; label: string; cats: string[] | null }> = [
  { id: 'all', label: 'ALL', cats: null },
  { id: 'formal', label: 'FORMAL', cats: ['formal', 'smart_casual', 'uniform'] },
  { id: 'casual', label: 'CASUAL', cats: ['casual'] },
  { id: 'traditional', label: 'TRADITIONAL', cats: ['filipiniana'] },
  { id: 'sporty', label: 'SPORTY', cats: ['active'] },
];

const FEATURED_ACCESSORIES_FEMALE = [
  { tab: 'Earrings', id: 'ea-gold-hoop' },
  { tab: 'Necklace', id: 'nk-gold-chain' },
  { tab: 'Bags', id: 'bg-black-shoulder' },
  { tab: 'Watch', id: 'ot-watch-rose' },
  { tab: 'Glasses', id: 'ot-sunglasses' },
] as const;

const FEATURED_ACCESSORIES_MALE = [
  { tab: 'Glasses', id: 'ot-sunglasses' },
  { tab: 'Watch', id: 'ot-watch' },
  { tab: 'Belt', id: 'ot-belt-brown' },
  { tab: 'Tie', id: 'ot-tie-navy' },
  { tab: 'Bags', id: 'bg-sling' },
] as const;

export function CategoryScreen({
  selectedId,
  selectedDesignId,
  selectedAccessories,
  gender,
  onSelect,
  onSelectDesign,
  onToggleAccessory,
}: CategoryScreenProps) {
  const [filter, setFilter] = useState('all');
  const modelSrc =
    gender === 'male'
      ? `${import.meta.env.BASE_URL}models/template-male-office.png`
      : MODEL_FALLBACK;
  const featuredAccessories = gender === 'male' ? FEATURED_ACCESSORIES_MALE : FEATURED_ACCESSORIES_FEMALE;

  const looks = useMemo(() => {
    const all = designsForVisitor(gender);
    const featuredIds = featuredLookIdsFor(gender);
    const featured = featuredIds
      .map((id) => getDesignById(id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .filter((d) => !d.audience || d.audience === 'unisex' || d.audience === gender || !gender);
    const active = FILTERS.find((f) => f.id === filter);
    if (filter === 'all') {
      const rest = all.filter((d) => !featuredIds.includes(d.id));
      return [...featured, ...rest];
    }
    const filtered = active?.cats ? all.filter((d) => active.cats!.includes(d.category_id)) : all;
    return filtered;
  }, [filter, gender]);

  return (
    <section className="screen">
      <p className="screen-sub">Select the type of outfit you want to explore.</p>

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFilter(f.id);
              if (f.cats?.[0]) onSelect(f.cats[0]);
            }}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold uppercase ${
              filter === f.id ? 'bg-navy text-white' : 'bg-slate-100 text-navy'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {looks.map((design, i) => {
          const src = resolvePreviewUrl(design.id) || modelSrc;
          const active = selectedDesignId === design.id || selectedId === design.category_id;
          return (
            <motion.button
              key={design.id}
              type="button"
              onClick={() => onSelectDesign(design.id, design.category_id)}
              className={`relative w-[112px] shrink-0 overflow-hidden rounded-2xl border-2 bg-[#efe6d6] shadow-sm ${
                selectedDesignId === design.id ? 'border-navy' : 'border-line'
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              {selectedDesignId === design.id ? (
                <span className="absolute right-1.5 top-1.5 z-[1] grid h-5 w-5 place-items-center rounded-full bg-navy text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              ) : null}
              <div className="flex h-[196px] items-end justify-center bg-[#efe6d6]">
                {src ? (
                  <img src={src} alt={design.name} className="h-[188px] w-full object-cover object-top" draggable={false} />
                ) : (
                  <div className="h-full w-full" style={{ background: active ? '#0B1F3A' : '#E2E8F0' }} />
                )}
              </div>
              <p className="truncate px-1.5 py-1.5 text-center text-[9px] font-extrabold text-navy">{design.name}</p>
            </motion.button>
          );
        })}
      </div>

      <p className="mb-2 mt-4 text-[11px] font-extrabold uppercase tracking-wide text-muted">Accessories</p>
      <div className="grid grid-cols-5 gap-2">
        {featuredAccessories.map((feat) => {
          const item = ACCESSORY_ITEMS.find((a) => a.id === feat.id);
          if (!item) return null;
          const active = selectedAccessories.includes(item.id);
          return (
            <div key={feat.id} className="flex flex-col items-center">
              <p className="mb-1 text-center text-[8px] font-extrabold uppercase text-muted">{feat.tab}</p>
              <AccessorySwatch
                item={item}
                active={active}
                size={72}
                showLabel={false}
                onClick={() => onToggleAccessory(item.id)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
