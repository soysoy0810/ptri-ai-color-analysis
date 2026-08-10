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
    <section className="screen relative overflow-hidden pb-2">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-navy to-accent text-[11px] font-extrabold text-white">
            DOST
            <span className="text-[9px] -mt-0.5">PTRI</span>
          </div>
          <div>
            <strong className="block text-xs font-extrabold text-navy">DOST–PTRI</strong>
            <span className="text-[10px] text-muted">Philippine Textile Research Institute</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-extrabold text-navy">{time}</div>
          <div className="text-[11px] text-muted">{day}</div>
        </div>
      </div>

      <div className="relative z-[1] flex flex-1 flex-col">
        <div className="pr-[38%]">
          <h1 className="mb-2 text-[2.05rem] font-extrabold leading-[1.05] tracking-tight text-navy">
            PTRI AI
            <br />
            COLOR ANALYSIS
          </h1>
          <p className="mb-6 text-sm font-semibold text-accent">
            Smart Colors. Perfect Style. Made for You.
          </p>

          <ul className="space-y-3">
            {FEATURE_BULLETS.map((item) => {
              const Icon = ICONS[item.id];
              return (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-navy text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <strong className="block text-sm font-bold text-navy">{item.title}</strong>
                    <span className="text-xs text-muted">{item.subtitle}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <AiNetworkFace className="absolute right-[-8px] top-8 h-[240px] w-[170px] animate-[pulse-soft_2.8s_ease-in-out_infinite]" />

        <div className="mt-auto pt-8">
          <button type="button" className="btn btn-primary w-full text-base tracking-wide" onClick={onStart}>
            TOUCH TO START
            <ChevronRight className="h-5 w-5" />
          </button>
          <p className="mt-3 text-center text-xs font-semibold text-muted">
            Empowering Textiles. Enhancing Lives.
          </p>
        </div>
      </div>

      <TrianglePattern className="absolute -bottom-2 -right-4 h-36 w-44 opacity-90" />
    </section>
  );
}
