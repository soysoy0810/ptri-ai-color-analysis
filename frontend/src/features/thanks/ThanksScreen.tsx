import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { TrianglePattern } from '../../shared/ui/TrianglePattern';

interface ThanksScreenProps {
  name: string;
  onReset: () => void;
}

export function ThanksScreen({ name, onReset }: ThanksScreenProps) {
  useEffect(() => {
    const t = window.setTimeout(onReset, 6000);
    return () => window.clearTimeout(t);
  }, [onReset]);

  const firstName = name.trim().split(/\s+/)[0];

  return (
    <section className="screen relative items-center justify-center overflow-hidden text-center">
      <div className="grid h-[120px] w-[120px] place-items-center rounded-full bg-gradient-to-br from-accent to-navy text-white shadow-[0_20px_50px_rgba(47,128,237,0.35)] animate-[pulse-soft_2.8s_ease-in-out_infinite]">
        <Check className="h-12 w-12" strokeWidth={3} />
      </div>
      <h1 className="screen-title mt-5">
        Thank You{firstName ? `, ${firstName}` : ''}!
      </h1>
      <p className="screen-sub mb-0 max-w-sm">
        Your session is complete. Temporary data will clear for the next visitor.
      </p>
      <button type="button" className="btn btn-primary mt-6 w-full max-w-xs" onClick={onReset}>
        Start New Session
      </button>
      <p className="mt-4 text-xs font-semibold text-muted">
        Empowering Textiles. Enhancing Lives.
      </p>
      <TrianglePattern className="absolute -bottom-2 -right-4 h-36 w-44 opacity-80" />
    </section>
  );
}
