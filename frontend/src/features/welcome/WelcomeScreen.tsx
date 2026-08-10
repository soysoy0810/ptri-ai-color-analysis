import { motion } from 'framer-motion';
import { Cpu, Layers, UserRound } from 'lucide-react';
import { FEATURE_BULLETS } from '../../data/catalog';
import { useLiveClock } from '../../shared/hooks/useLiveClock';
import { DostPtriLogo } from '../../shared/ui/DostPtriLogo';
import { TouchPulseCue } from '../../shared/ui/TouchPulseCue';

interface WelcomeScreenProps {
  onStart: () => void;
}

/** The approved artwork with the AI woman + textile pattern, text removed */
const ART = `${import.meta.env.BASE_URL}brand/home-art-clean.png`;

const ICONS = {
  ai: Cpu,
  textiles: Layers,
  personal: UserRound,
} as const;

/** Pulsing mesh nodes over the woman's head so the AI figure feels alive */
function FaceMeshPulse({ className = '' }: { className?: string }) {
  const nodes: Array<[number, number]> = [
    [30, 10], [52, 6], [72, 13], [86, 27], [66, 23], [44, 19],
    [78, 43], [60, 39], [88, 59], [70, 63], [82, 79], [64, 85],
    [90, 93], [74, 11], [92, 35],
  ];
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden="true">
      {nodes.map(([x, y], i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-sky-200 shadow-[0_0_8px_rgba(125,211,252,0.9)]"
          style={{ left: `${x}%`, top: `${y}%` }}
          animate={{ opacity: [0.15, 1, 0.15], scale: [0.8, 1.6, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

/**
 * Home: the approved artwork is the entire background (AI woman + blue
 * textile pattern, untouched). Real interactive UI is layered exactly
 * where the design places it.
 */
export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const { time, day } = useLiveClock();

  return (
    <section className="relative flex h-full min-h-full flex-col overflow-hidden bg-white px-6 pb-6 pt-5">
      {/* Exact artwork background with a slow breathing motion */}
      <motion.img
        src={ART}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[right_bottom]"
        draggable={false}
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Living overlays on the woman: mesh pulse + scan shimmer */}
      <FaceMeshPulse className="absolute right-0 top-[4%] z-[1] h-[46%] w-[42%]" />
      <motion.div
        className="pointer-events-none absolute right-0 top-[6%] z-[1] h-[52%] w-[40%] rounded-full bg-gradient-to-b from-transparent via-sky-300/20 to-transparent"
        animate={{ y: ['-6%', '12%', '-6%'], opacity: [0.1, 0.4, 0.1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Header */}
      <header className="relative z-[3] mb-6 flex items-start justify-between gap-3">
        <motion.div
          className="flex min-w-0 items-center gap-2.5"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DostPtriLogo className="h-[54px] w-[54px] shrink-0" />
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
          className="shrink-0 pt-0.5 text-right"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-[15px] font-extrabold leading-none text-navy">{time}</div>
          <div className="mt-1 text-[11px] font-semibold text-navy">{day}</div>
        </motion.div>
      </header>

      {/* Hero text */}
      <div className="relative z-[3] mt-2 max-w-[62%]">
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

      {/* Feature list */}
      <ul className="relative z-[3] mt-8 space-y-3.5">
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

      {/* CTA raised to chest height of the AI figure, same left position */}
      <div className="relative z-[3] mt-auto pb-[36%]">
        <motion.button
          type="button"
          onClick={onStart}
          className="relative flex min-h-[58px] w-[min(100%,320px)] items-center rounded-2xl bg-gradient-to-r from-navy to-[#16407c] px-6 text-[1.05rem] font-extrabold tracking-wide text-white shadow-[0_14px_30px_rgba(11,31,58,0.4)]"
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
