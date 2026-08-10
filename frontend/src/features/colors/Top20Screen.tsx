import { useState } from 'react';
import { motion } from 'framer-motion';
import { Info, Star } from 'lucide-react';
import type { PaletteColor } from '../../shared/lib/types';

interface Top20ScreenProps {
  colors: PaletteColor[];
  onSuggestTop5: () => void;
}

export function Top20Screen({ colors, onSuggestTop5 }: Top20ScreenProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <section className="screen">
      <h1 className="screen-title">These are 20 colors that suit you best.</h1>

      <div className="mt-2 grid grid-cols-4 gap-2.5">
        {colors.slice(0, 20).map((color, i) => (
          <motion.div
            key={color.id}
            className="relative overflow-hidden rounded-xl"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 260, damping: 18 }}
          >
            <div
              className="aspect-square rounded-xl shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
              style={{ background: color.hex }}
              title={color.name}
            />
            {showDetails ? (
              <motion.span
                className="absolute inset-x-0 bottom-0 truncate bg-navy/80 px-1 py-0.5 text-center text-[9px] font-bold text-white"
                initial={{ y: 14 }}
                animate={{ y: 0 }}
              >
                {color.name}
              </motion.span>
            ) : null}
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          className="btn border-2 border-navy bg-white text-navy"
          onClick={() => setShowDetails((v) => !v)}
        >
          <Info className="h-4 w-4" />
          {showDetails ? 'HIDE DETAILS' : 'VIEW DETAILS'}
        </button>
        <button
          type="button"
          className="btn border-2 border-accent bg-white text-accent hover:bg-accent-soft"
          onClick={onSuggestTop5}
        >
          <Star className="h-4 w-4 fill-accent text-accent" />
          AI TOP 5
        </button>
      </div>
    </section>
  );
}
