import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { ANALYSIS_STEPS } from '../../data/catalog';
import { ProgressRing } from '../../shared/ui/ProgressRing';

interface AnalysisScreenProps {
  onDone: () => void;
}

export function AnalysisScreen({ onDone }: AnalysisScreenProps) {
  const [progress, setProgress] = useState(8);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= ANALYSIS_STEPS.length) {
      setProgress(100);
      const t = window.setTimeout(onDone, 550);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      setActive((v) => v + 1);
      setProgress(Math.round(((active + 1) / ANALYSIS_STEPS.length) * 100));
    }, 780);
    return () => window.clearTimeout(t);
  }, [active, onDone]);

  return (
    <section className="screen items-center text-center">
      <h1 className="screen-title mb-1 w-full text-center">
        Analyzing your natural color attributes...
      </h1>

      <div className="my-7">
        <ProgressRing value={progress} size={188} stroke={14} />
      </div>

      <div className="w-full max-w-[360px] space-y-3 text-left">
        {ANALYSIS_STEPS.map((step, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <div key={step} className="flex items-center gap-3 text-[15px] font-semibold">
              <span className="grid h-7 w-7 place-items-center">
                {done ? (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                ) : current ? (
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                ) : (
                  <span className="h-6 w-6 rounded-full border-2 border-line" />
                )}
              </span>
              <span className={done ? 'text-navy' : current ? 'text-accent' : 'text-muted'}>
                {step}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-8 max-w-[340px] text-[13px] font-medium leading-snug text-muted">
        Tip: Keep your face centered and avoid heavy makeup for best results.
      </p>
    </section>
  );
}
