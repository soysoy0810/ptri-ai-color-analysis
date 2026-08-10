import { Star } from 'lucide-react';
import type { PaletteColor } from '../../shared/lib/types';

interface Top20ScreenProps {
  colors: PaletteColor[];
  onSuggestTop5: () => void;
}

export function Top20Screen({ colors, onSuggestTop5 }: Top20ScreenProps) {
  return (
    <section className="screen">
      <h1 className="screen-title">These are 20 colors that suit you best.</h1>

      <div className="mt-2 grid grid-cols-4 gap-2.5">
        {colors.slice(0, 20).map((color) => (
          <div
            key={color.id}
            className="aspect-square rounded-xl shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
            style={{ background: color.hex }}
            title={color.name}
          />
        ))}
      </div>

      <button
        type="button"
        className="btn mt-5 w-full border-2 border-accent bg-white text-accent hover:bg-accent-soft"
        onClick={onSuggestTop5}
      >
        <Star className="h-4 w-4 fill-accent" />
        AI SUGGESTS TOP 5 COLORS FOR YOU
      </button>
    </section>
  );
}
