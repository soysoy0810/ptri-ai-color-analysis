import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import type { PaletteColor, SelectionMode } from '../../shared/lib/types';

interface ChooseTopScreenProps {
  colors: PaletteColor[];
  mode: SelectionMode;
  selectedColors: PaletteColor[];
  onModeChange: (mode: SelectionMode) => void;
  onToggleColor: (color: PaletteColor, limit: number) => void;
}

const TABS = [
  { id: 'top5' as const, label: 'TOP 5' },
  { id: 'top10' as const, label: 'TOP 10' },
  { id: 'custom' as const, label: 'CUSTOM' },
];

export function ChooseTopScreen({
  colors,
  mode,
  selectedColors,
  onModeChange,
  onToggleColor,
}: ChooseTopScreenProps) {
  const limit = mode === 'top5' ? 5 : 10;

  return (
    <section className="screen">
      <h1 className="screen-title">Select the colors you love most.</h1>

      {/* Mode tabs — TOP 5 / TOP 10 / CUSTOM like the board */}
      <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-accent-soft p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`relative min-h-touch rounded-xl text-sm font-extrabold transition ${
              mode === tab.id ? 'text-white' : 'text-navy'
            }`}
            onClick={() => onModeChange(tab.id)}
          >
            {mode === tab.id ? (
              <motion.span
                layoutId="choose-tab"
                className="absolute inset-0 rounded-xl bg-navy shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            ) : null}
            <span className="relative">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {colors.slice(0, 20).map((color, i) => {
          const active = selectedColors.some((c) => c.id === color.id);
          const pickOrder = selectedColors.findIndex((c) => c.id === color.id) + 1;
          return (
            <motion.button
              key={color.id}
              type="button"
              className={`relative aspect-square rounded-xl shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] ${
                active ? 'outline outline-[3px] outline-navy outline-offset-2' : ''
              }`}
              style={{ background: color.hex }}
              onClick={() => onToggleColor(color, limit)}
              aria-label={color.name}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              whileTap={{ scale: 0.9 }}
            >
              {active ? (
                <motion.span
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-navy text-white shadow"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                >
                  {mode === 'custom' ? (
                    <span className="text-[11px] font-extrabold">{pickOrder}</span>
                  ) : (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  )}
                </motion.span>
              ) : null}
            </motion.button>
          );
        })}
      </div>

      <motion.p
        className="mt-4 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-muted"
        key={selectedColors.length}
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
      >
        <Sparkles className="h-4 w-4 text-accent" />
        {mode === 'custom'
          ? `${selectedColors.length} selected — pick up to ${limit}.`
          : `You have selected ${selectedColors.length} / ${limit} colors.`}
      </motion.p>
    </section>
  );
}
