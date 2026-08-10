import { ChevronRight, Sparkles, Star, Layers } from 'lucide-react';
import { FEATURE_BULLETS } from '../../data/catalog';
import { useLiveClock } from '../../shared/hooks/useLiveClock';
import { AiNetworkFace } from '../../shared/ui/AiNetworkFace';
import { TrianglePattern } from '../../shared/ui/TrianglePattern';

interface WelcomeScreenProps {
  onStart: () => void;
}

const ICONS = {
  ai: Sparkles,
  textiles: Layers,
  personal: Star,
} as const;

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const { time, day } = useLiveClock();

  return (
    <section className="relative flex h-full min-h-full flex-col overflow-hidden bg-white px-5 pb-4 pt-4">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] bg-navy text-white">
            <span className="text-[10px] font-extrabold leading-none">DOST</span>
            <span className="text-[11px] font-extrabold leading-none">PTRI</span>
          </div>
          <div>
            <strong className="block text-[14px] font-extrabold leading-tight text-navy">DOST–PTRI</strong>
            <span className="text-[10px] font-medium text-muted">Philippine Textile Research Institute</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[14px] font-extrabold text-navy">
            {time} <span className="text-muted">|</span>
          </div>
          <div className="text-[11px] font-medium text-muted">{day}</div>
        </div>
      </header>

      <div className="relative mb-5 min-h-[200px]">
        <div className="relative z-[1] max-w-[58%]">
          <h1 className="text-[2.15rem] font-extrabold uppercase leading-[1.05] tracking-tight text-navy">
            PTRI AI
            <br />
            COLOR ANALYSIS
          </h1>
          <p className="mt-3 text-[0.95rem] font-semibold leading-snug text-accent">
            Smart Colors. Perfect Style.
            <br />
            Made for You.
          </p>
        </div>
        <AiNetworkFace className="pointer-events-none absolute -right-4 top-[-6px] h-[220px] w-[175px]" />
      </div>

      <ul className="relative z-[1] space-y-4">
        {FEATURE_BULLETS.map((item) => {
          const Icon = ICONS[item.id];
          return (
            <li key={item.id} className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-white">
                <Icon className="h-4 w-4" strokeWidth={2.4} />
              </span>
              <strong className="text-[1rem] font-extrabold text-navy">{item.title}</strong>
            </li>
          );
        })}
      </ul>

      <div className="relative mt-auto pt-8">
        <TrianglePattern className="absolute bottom-6 -right-3 h-36 w-48" />
        <button
          type="button"
          onClick={onStart}
          className="relative z-[2] flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-navy text-[1.02rem] font-extrabold tracking-wide text-white shadow-[0_12px_28px_rgba(11,31,58,0.28)] active:scale-[0.985]"
        >
          TOUCH TO START
          <ChevronRight className="h-5 w-5" strokeWidth={2.6} />
        </button>
        <p className="relative z-[2] mt-3 text-center text-[11px] font-semibold text-muted">
          Empowering Textiles. Enhancing Lives.
        </p>
      </div>
    </section>
  );
}
