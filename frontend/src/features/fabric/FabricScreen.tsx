import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { TEXTILES, type TextileId } from '../../data/textiles';
import type { FabricItem } from '../../shared/lib/types';

interface FabricScreenProps {
  fabrics: FabricItem[];
  selectedId: string | null;
  selectedTextileId?: TextileId | null;
  onSelect: (fabricId: string) => void;
  onSelectTextile?: (textileId: TextileId | null) => void;
}

const FIBERS = ['Cotton', 'Linen', 'Silk', 'Blend', 'Others'] as const;

export function FabricScreen({ fabrics, selectedId, selectedTextileId = null, onSelect, onSelectTextile }: FabricScreenProps) {
  const [tab, setTab] = useState<'textile' | 'fabric'>('textile');
  const [fiber, setFiber] = useState<string>('Cotton');

  const ranked = useMemo(() => fabrics.slice(0, 8), [fabrics]);

  return (
    <section className="screen">
      <p className="screen-sub">Explore Philippine textiles and fabrics to match your style.</p>

      <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5">
        <button
          type="button"
          className={`min-h-touch rounded-xl text-sm font-extrabold ${tab === 'textile' ? 'bg-navy text-white' : 'text-navy'}`}
          onClick={() => setTab('textile')}
        >
          TEXTILE
        </button>
        <button
          type="button"
          className={`min-h-touch rounded-xl text-sm font-extrabold ${tab === 'fabric' ? 'bg-navy text-white' : 'text-navy'}`}
          onClick={() => setTab('fabric')}
        >
          FABRIC
        </button>
      </div>

      {tab === 'textile' ? (
        <div className="grid grid-cols-4 gap-2">
          {TEXTILES.map((t, i) => {
            const pickId = ranked[i]?.id || fabrics[0]?.id;
            const active = selectedTextileId === t.id;
            return (
              <motion.button
                key={t.id}
                type="button"
                className={`relative overflow-hidden rounded-xl border-2 ${
                  active ? 'border-accent' : 'border-line'
                }`}
                onClick={() => {
                  if (pickId) onSelect(pickId);
                  onSelectTextile?.(t.id);
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                {active ? (
                  <span className="absolute right-1 top-1 z-[1] grid h-5 w-5 place-items-center rounded-full bg-accent text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
                <img src={t.src} alt={t.name} className="aspect-square w-full object-cover" draggable={false} />
                <p className="truncate px-1 py-1 text-center text-[10px] font-extrabold text-navy">{t.name}</p>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {ranked.map((fabric, i) => {
            const active = selectedId === fabric.id;
            return (
              <motion.button
                key={fabric.id}
                type="button"
                className={`overflow-hidden rounded-2xl border-2 text-left ${active ? 'border-accent' : 'border-line'}`}
                onClick={() => {
                  onSelectTextile?.(null);
                  onSelect(fabric.id);
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="h-16" style={{ background: fabric.hex }} />
                <div className="p-2">
                  <strong className="block text-[12px] font-bold text-navy">{fabric.name}</strong>
                  <span className="text-[11px] font-extrabold text-accent">{fabric.match ?? fabric.base_match}% match</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      <p className="mt-4 rounded-xl bg-accent-soft px-3 py-2 text-center text-[11px] font-semibold text-navy">
        These textiles are proudly made in the Philippines and supported by PTRI.
      </p>

      <p className="mb-2 mt-4 text-[11px] font-extrabold uppercase tracking-wide text-muted">Fabric type</p>
      <div className="flex flex-wrap gap-2">
        {FIBERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`rounded-full border-2 px-3 py-1.5 text-[11px] font-extrabold ${
              fiber === f ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy'
            }`}
            onClick={() => setFiber(f)}
          >
            {f}
          </button>
        ))}
      </div>
    </section>
  );
}
