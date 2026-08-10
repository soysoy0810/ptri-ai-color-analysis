import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import type { FabricItem } from '../../shared/lib/types';

interface FabricScreenProps {
  fabrics: FabricItem[];
  selectedId: string | null;
  onSelect: (fabricId: string) => void;
}

/** Fabric collection filters like the board's left rail, as touch chips */
const COLLECTIONS = [
  { id: 'all', label: 'All Fabrics', match: () => true },
  {
    id: 'natural',
    label: 'Natural Fibers',
    match: (f: FabricItem) => /abaca|pineapple|handloom|natural/i.test(f.name),
  },
  {
    id: 'blends',
    label: 'Blends',
    match: (f: FabricItem) => /blend|softweave|weave/i.test(f.name),
  },
  {
    id: 'special',
    label: 'Special Fabrics',
    match: (f: FabricItem) => /tropical|fiber/i.test(f.name),
  },
] as const;

export function FabricScreen({ fabrics, selectedId, onSelect }: FabricScreenProps) {
  const [collection, setCollection] = useState<string>('all');

  const visible = useMemo(() => {
    const col = COLLECTIONS.find((c) => c.id === collection) ?? COLLECTIONS[0];
    const filtered = fabrics.filter(col.match);
    return filtered.length ? filtered : fabrics;
  }, [fabrics, collection]);

  return (
    <section className="screen">
      <h1 className="screen-title">Choose the best PTRI fabric for you.</h1>

      {/* Collection chips */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {COLLECTIONS.map((col) => (
          <button
            key={col.id}
            type="button"
            className={`shrink-0 rounded-full border-2 px-4 py-2 text-xs font-extrabold transition ${
              collection === col.id
                ? 'border-navy bg-navy text-white'
                : 'border-line bg-white text-navy'
            }`}
            onClick={() => setCollection(col.id)}
          >
            {col.label}
          </button>
        ))}
      </div>

      {/* Fabric swatch grid with AI match ranking */}
      <div className="grid grid-cols-2 gap-3">
        {visible.map((fabric, i) => {
          const active = selectedId === fabric.id;
          const aiPick = i === 0 && (fabric.match ?? 0) > 0;
          return (
            <motion.button
              key={fabric.id}
              type="button"
              className={`relative overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition ${
                active ? 'border-accent shadow-[0_0_0_3px_rgba(47,128,237,0.15)]' : 'border-line'
              }`}
              onClick={() => onSelect(fabric.id)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
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
              {aiPick ? (
                <motion.span
                  className="absolute left-2 top-2 z-[1] flex items-center gap-1 rounded-full bg-navy px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-white shadow"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  <Sparkles className="h-3 w-3 text-sky-300" />
                  Best for You
                </motion.span>
              ) : null}

              {/* woven texture swatch */}
              <div
                className="h-[86px] w-full"
                style={{
                  background: fabric.hex,
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0 3px, transparent 3px 6px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.06) 0 3px, transparent 3px 6px)',
                }}
              />
              <div className="p-2.5">
                <strong className="block truncate text-[13px] font-bold text-navy">
                  {fabric.name}
                </strong>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="text-[11px] text-muted">{fabric.code}</span>
                  <span className="text-[12px] font-extrabold text-accent">
                    {fabric.match ?? fabric.base_match}% match
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
