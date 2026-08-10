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
      <h1 className="screen-title mb-1 w-full text-center">Analyzing your natural color attributes...</h1>

      <div className="my-6">
        <ProgressRing value={progress} size={180} stroke={14} />
      </div>

      <div className="w-full space-y-2.5 text-left">
        {ANALYSIS_STEPS.map((step, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <div
              key={step}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold ${
                done
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : current
                    ? 'border-sky-200 bg-accent-soft text-accent'
                    : 'border-line bg-white text-muted'
              }`}
            >
              <span className="grid h-6 w-6 place-items-center">
                {done ? (
                  <Check className="h-5 w-5" strokeWidth={2.8} />
                ) : current ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-line" />
                )}
              </span>
              {step}
            </div>
          );
        })}
      </div>

      <div className="mt-5 w-full rounded-2xl border border-accent/25 bg-accent-soft px-4 py-3 text-left text-sm text-navy">
        <strong className="font-extrabold">Tip:</strong> Keep your face centered and avoid heavy makeup
        for best results.
      </div>
    </section>
  );
}
