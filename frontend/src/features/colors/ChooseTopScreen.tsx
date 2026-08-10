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
  const limit = mode === 'top5' ? 5 : mode === 'top10' ? 10 : 8;
  const canEdit = true;

  return (
    <section className="screen">
      <h1 className="screen-title">Choose Your Top</h1>
      <p className="screen-sub">Select Top 5, Top 10, or Custom colors you love most.</p>

      <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-accent-soft p-1.5">
        {(
          [
            { id: 'top5', label: 'TOP 5' },
            { id: 'top10', label: 'TOP 10' },
            { id: 'custom', label: 'CUSTOM' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`min-h-touch rounded-xl text-sm font-extrabold ${
              mode === tab.id ? 'bg-navy text-white shadow-sm' : 'bg-transparent text-navy'
            }`}
            onClick={() => onModeChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {colors.map((color) => {
          const active = selectedColors.some((c) => c.id === color.id);
          return (
            <button
              key={color.id}
              type="button"
              className={`swatch ${active ? 'active' : ''}`}
              style={{ background: color.hex }}
              onClick={() => canEdit && onToggleColor(color, limit)}
              aria-label={color.name}
            >
              {active ? (
                <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
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
