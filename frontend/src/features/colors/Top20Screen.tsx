import { Sparkles } from 'lucide-react';
import type { PaletteColor } from '../../shared/lib/types';

interface Top20ScreenProps {
  colors: PaletteColor[];
  onSuggestTop5: () => void;
}

export function Top20Screen({ colors, onSuggestTop5 }: Top20ScreenProps) {
  return (
    <section className="screen">
      <h1 className="screen-title">Your Top 20 Colors</h1>
      <p className="screen-sub">These are 20 colors that suit you best.</p>

      <div className="grid grid-cols-4 gap-2.5">
        {colors.map((color, i) => (
          <div
            key={color.id}
            className="swatch"
            style={{ background: color.hex }}
            title={color.name}
          >
            <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white/95 text-[10px] font-extrabold text-navy">
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-accent mt-5 w-full" onClick={onSuggestTop5}>
        <Sparkles className="h-4 w-4" />
        AI SUGGESTS TOP 5 COLORS FOR YOU
      </button>
    </section>
  );
}
