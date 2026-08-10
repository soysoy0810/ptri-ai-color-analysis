import { useEffect, useState } from 'react';
import { Check, Circle } from 'lucide-react';
import { ANALYSIS_STEPS } from '../../data/catalog';
import { ProgressRing } from '../../shared/ui/ProgressRing';

interface AnalysisScreenProps {
  onDone: () => void;
}

export function AnalysisScreen({ onDone }: AnalysisScreenProps) {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= ANALYSIS_STEPS.length) {
      const t = window.setTimeout(onDone, 500);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      setActive((v) => v + 1);
      setProgress(Math.round(((active + 1) / ANALYSIS_STEPS.length) * 100));
    }, 750);
    return () => window.clearTimeout(t);
  }, [active, onDone]);

  return (
    <section className="screen">
      <h1 className="screen-title">Analyzing</h1>
      <p className="screen-sub">Analyzing your natural color attributes...</p>

      <ProgressRing value={progress} />

      <div className="mt-6 space-y-2.5">
        {ANALYSIS_STEPS.map((step, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <div
              key={step}
              className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3.5 text-sm font-semibold ${
                done
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : current
                    ? 'border-sky-200 bg-accent-soft text-accent'
                    : 'border-line bg-white text-muted'
              }`}
            >
              <span className="grid h-6 w-6 place-items-center">
                {done ? <Check className="h-4 w-4" /> : <Circle className={`h-4 w-4 ${current ? 'animate-pulse' : ''}`} />}
              </span>
              {step}
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-navy">
        <strong className="font-bold">Tip:</strong> Please keep your face centered and avoid wearing
        heavy makeup.
      </div>
    </section>
  );
}
