import { Check } from 'lucide-react';
import type { PaletteColor, SelectionMode } from '../../shared/lib/types';

interface ChooseTopScreenProps {
  colors: PaletteColor[];
  mode: SelectionMode;
  selectedColors: PaletteColor[];
  onModeChange: (mode: SelectionMode) => void;
  onToggleColor: (color: PaletteColor, limit: number) => void;
}

export function ChooseTopScreen({
  colors,
  mode,
  selectedColors,
  onModeChange,
  onToggleColor,
}: ChooseTopScreenProps) {
  const limit = mode === 'top10' ? 10 : 5;

  return (
    <section className="screen">
      <h1 className="screen-title">Select the colors you love most.</h1>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-accent-soft p-1.5">
        {(
          [
            { id: 'top5' as const, label: 'TOP 5' },
            { id: 'top10' as const, label: 'TOP 10' },
          ]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`min-h-touch rounded-xl text-sm font-extrabold ${
              mode === tab.id || (mode === 'custom' && tab.id === 'top5')
                ? 'bg-navy text-white shadow-sm'
                : 'bg-transparent text-navy'
            }`}
            onClick={() => onModeChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {colors.slice(0, 20).map((color) => {
          const active = selectedColors.some((c) => c.id === color.id);
          return (
            <button
              key={color.id}
              type="button"
              className={`relative aspect-square rounded-xl shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] ${
                active ? 'outline outline-[3px] outline-accent outline-offset-2' : ''
              }`}
              style={{ background: color.hex }}
              onClick={() => onToggleColor(color, limit)}
              aria-label={color.name}
            >
              {active ? (
                <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-accent text-white shadow">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-sm font-semibold text-muted">
        You have selected {selectedColors.length} / {limit} colors.
      </p>
    </section>
  );
}
