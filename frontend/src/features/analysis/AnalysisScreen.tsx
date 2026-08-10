import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { ANALYSIS_STEPS } from '../../data/catalog';

interface AnalysisScreenProps {
  onDone: () => void;
}

/** Spinning segmented AI ring, exactly like the "03 ANALYZING" card on the board */
function AiRing() {
  return (
    <div className="relative mx-auto h-[190px] w-[190px]">
      {/* soft halo */}
      <motion.div
        className="absolute -inset-4 rounded-full bg-accent/10"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      />
      {/* spinning gradient arc */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'conic-gradient(from 0deg, #2F80ED 0%, #7DD3FC 30%, rgba(232,241,255,0.9) 55%, #E8F1FF 100%)',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 16px), black calc(100% - 15px))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 16px), black calc(100% - 15px))',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      />
      {/* AI badge center */}
      <div className="absolute inset-[26px] grid place-items-center rounded-full bg-gradient-to-br from-accent to-navy shadow-[0_16px_36px_rgba(47,128,237,0.4)]">
        <motion.span
          className="text-4xl font-extrabold text-white"
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          AI
        </motion.span>
      </div>
    </div>
  );
}

export function AnalysisScreen({ onDone }: AnalysisScreenProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= ANALYSIS_STEPS.length) {
      const t = window.setTimeout(onDone, 550);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setActive((v) => v + 1), 780);
    return () => window.clearTimeout(t);
  }, [active, onDone]);

  return (
    <section className="screen items-center text-center">
      <motion.h1
        className="screen-title mb-1 w-full max-w-[300px] text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        AI is analyzing your natural color attributes...
      </motion.h1>

      <div className="my-8">
        <AiRing />
      </div>

      <motion.p
        className="mb-6 text-[15px] font-semibold text-muted"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        Please wait a moment
      </motion.p>

      <div className="w-full max-w-[340px] space-y-3 text-left">
        {ANALYSIS_STEPS.map((step, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <motion.div
              key={step}
              className="flex items-center gap-3 text-[15px] font-semibold"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <span className="grid h-7 w-7 place-items-center">
                {done ? (
                  <motion.span
                    className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </motion.span>
                ) : current ? (
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                ) : (
                  <span className="h-6 w-6 rounded-full border-2 border-line" />
                )}
              </span>
              <span className={done ? 'text-navy' : current ? 'text-accent' : 'text-muted'}>
                {step}
              </span>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
