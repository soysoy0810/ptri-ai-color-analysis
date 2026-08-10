import { motion } from 'framer-motion';
import { Cpu, Layers, UserRound } from 'lucide-react';
import { FEATURE_BULLETS } from '../../data/catalog';
import { useLiveClock } from '../../shared/hooks/useLiveClock';
import { DostPtriLogo } from '../../shared/ui/DostPtriLogo';
import { TouchPulseCue } from '../../shared/ui/TouchPulseCue';
import { WaveAccent } from '../../shared/ui/WaveAccent';

interface WelcomeScreenProps {
  onStart: () => void;
}

const HERO_ART = `${import.meta.env.BASE_URL}brand/home-hero.png`;

const ICONS = {
  ai: Cpu,
  textiles: Layers,
  personal: UserRound,
} as const;

/** Pulsing mesh nodes over the artwork face — keeps the AI figure "alive" */
function FaceMeshPulse({ className = '' }: { className?: string }) {
  const nodes: Array<[number, number]> = [
    [30, 8], [52, 5], [72, 12], [86, 26], [66, 22], [44, 18],
    [78, 42], [60, 38], [88, 58], [70, 62], [82, 78], [64, 84],
    [90, 92], [74, 10], [92, 34],
  ];
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden="true">
      {nodes.map(([x, y], i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-sky-200 shadow-[0_0_8px_rgba(125,211,252,0.9)]"
          style={{ left: `${x}%`, top: `${y}%` }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.5, 0.8] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.14 }}
        />
      ))}
    </div>
  );
}

/**
 * Home: approved artwork as the living background,
 * with real interactive UI (live clock, real button) and motion on top.
 */
export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const { time, day } = useLiveClock();

  return (
    <section className="relative flex h-full min-h-full flex-col overflow-hidden bg-white px-5 pb-6 pt-5">
      {/* Artwork background — woman + textile art, slow breathing motion */}
      <motion.img
        src={HERO_ART}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-right"
        draggable={false}
        animate={{ scale: [1, 1.025, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* White wash over the left side so real text replaces the baked-in text */}
      <div
        className="absolute inset-y-0 left-0 w-[72%]"
        style={{
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.94) 52%, rgba(255,255,255,0.55) 78%, rgba(255,255,255,0) 100%)',
        }}
      />
      {/* Light wash on top so header stays crisp */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/85 to-transparent" />

      {/* Motion over the AI face */}
      <FaceMeshPulse className="absolute right-0 top-[6%] z-[1] h-[52%] w-[46%]" />
      <motion.div
        className="pointer-events-none absolute right-[2%] top-[8%] z-[1] h-[56%] w-[42%] rounded-full bg-gradient-to-b from-transparent via-sky-300/25 to-transparent"
        animate={{ y: ['-4%', '10%', '-4%'], opacity: [0.15, 0.45, 0.15] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Header — real components */}
      <header className="relative z-[3] mb-6 flex items-start justify-between gap-3">
        <motion.div
          className="flex min-w-0 items-center gap-2.5"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DostPtriLogo className="h-[56px] w-[56px] shrink-0" />
          <div className="min-w-0">
            <p className="text-[8.5px] font-bold leading-[1.25] text-navy">
              Department of Science and Technology
            </p>
            <p className="text-[8.5px] font-bold uppercase leading-[1.25] text-navy">
              Philippine Textile Research Institute
            </p>
            <p className="mt-0.5 text-[15px] font-extrabold leading-none text-navy">DOST-PTRI</p>
          </div>
        </motion.div>
        <motion.div
          className="shrink-0 rounded-xl bg-white/85 px-3 py-2 text-right shadow-sm backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-[15px] font-extrabold leading-none text-navy">{time}</div>
          <div className="mt-1 text-[11px] font-semibold text-navy">{day}</div>
        </motion.div>
      </header>

      {/* Hero text — real, selectable, animated in */}
      <div className="relative z-[3] max-w-[60%]">
        <motion.h1
          className="font-extrabold uppercase tracking-tight"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="block text-[3.4rem] leading-[0.95] text-navy">PTRI</span>
          <span className="mt-1 block text-[1.5rem] leading-[1.1]">
            <motion.span
              className="inline-block text-accent"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              AI
            </motion.span>{' '}
            <span className="text-navy">COLOR ANALYSIS</span>
          </span>
        </motion.h1>
        <motion.p
          className="mt-4 text-[1.02rem] font-semibold leading-snug text-navy"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          Smart Colors. Perfect Style.
          <br />
          Made for You.
        </motion.p>
      </div>

      {/* Feature list — real rows */}
      <ul className="relative z-[3] mt-7 space-y-3.5">
        {FEATURE_BULLETS.map((item, index) => {
          const Icon = ICONS[item.id];
          return (
            <motion.li
              key={item.id}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + index * 0.1 }}
            >
              <motion.span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy text-white"
                animate={{ scale: [1, 1.07, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.35 }}
              >
                <Icon className="h-4 w-4" strokeWidth={2.2} />
              </motion.span>
              <strong className="text-[0.98rem] font-extrabold text-navy">{item.title}</strong>
            </motion.li>
          );
        })}
      </ul>

      {/* Bottom: animated waves continue the artwork + real CTA */}
      <div className="relative z-[3] mt-auto pt-10">
        <WaveAccent className="absolute -bottom-3 -left-5 h-[190px] w-[85%] opacity-70" />

        <motion.button
          type="button"
          onClick={onStart}
          className="relative flex min-h-[58px] w-[min(100%,330px)] items-center rounded-2xl bg-navy px-6 text-[1.05rem] font-extrabold tracking-wide text-white shadow-[0_14px_30px_rgba(11,31,58,0.35)]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          whileTap={{ scale: 0.97 }}
        >
          <span>TOUCH TO START</span>
          <TouchPulseCue className="absolute -right-2 top-1/2 -translate-y-1/2" />
        </motion.button>
      </div>
    </section>
  );
}
