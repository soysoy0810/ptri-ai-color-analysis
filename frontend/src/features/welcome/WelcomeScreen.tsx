import { motion } from 'framer-motion';
import { Cpu, Layers, Sparkles, UserRound } from 'lucide-react';
import { FEATURE_BULLETS } from '../../data/catalog';
import { useLiveClock } from '../../shared/hooks/useLiveClock';
import { DostPtriLogo } from '../../shared/ui/DostPtriLogo';
import { TouchPulseCue } from '../../shared/ui/TouchPulseCue';

interface WelcomeScreenProps {
  onStart: () => void;
}

const ART = `${import.meta.env.BASE_URL}brand/home-art-clean.png`;

const ICONS = {
  ai: Cpu,
  textiles: Layers,
  personal: UserRound,
} as const;

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
          className="absolute h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.95)]"
          style={{ left: `${x}%`, top: `${y}%` }}
          animate={{ opacity: [0.15, 1, 0.15], scale: [0.8, 1.6, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const { time, day } = useLiveClock();

  return (
    <section className="relative flex h-full min-h-full flex-col overflow-hidden px-5 pb-6 pt-4">
      <motion.img
        src={ART}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[right_bottom]"
        draggable={false}
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <FaceMeshPulse className="absolute right-0 top-[4%] z-[1] h-[46%] w-[42%]" />
      <motion.div
        className="pointer-events-none absolute right-0 top-[6%] z-[1] h-[52%] w-[40%] rounded-full bg-gradient-to-b from-transparent via-sky-400/25 to-transparent"
        animate={{ y: ['-6%', '12%', '-6%'], opacity: [0.12, 0.45, 0.12] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-transparent via-sky-200/10 to-transparent"
        animate={{ x: ['-120%', '120%'] }}
        transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
        aria-hidden
      />

      {/* Government + AI content panel */}
      <div className="relative z-[3] flex min-h-0 flex-1 flex-col">
        {/* Official header strip */}
        <motion.header
          className="mb-3 shrink-0 border-b-2 border-[#C9A227]/80 pb-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <DostPtriLogo className="h-[52px] w-[52px] shrink-0 drop-shadow-sm" />
              <div className="min-w-0">
                <p className="text-[7.5px] font-bold uppercase tracking-[0.12em] text-navy/80">
                  Republic of the Philippines
                </p>
                <p className="text-[8.5px] font-bold leading-snug text-navy">
                  Department of Science and Technology
                </p>
              </div>
            </div>
            <div className="shrink-0 rounded-lg border border-white/40 bg-white/30 px-2 py-1 text-right backdrop-blur-[1px]">
              <div className="text-[13px] font-extrabold tabular-nums leading-none text-navy">{time}</div>
              <div className="mt-0.5 text-[9px] font-semibold text-navy/75">{day}</div>
            </div>
          </div>
        </motion.header>

        <div className="relative max-w-[58%] flex-1 p-3.5 pl-0">
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-transparent px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-accent">
                <Sparkles className="h-2.5 w-2.5" />
                AI Powered
              </span>
            </div>

            <h1 className="font-['Libre_Baskerville'] text-[1.05rem] font-bold uppercase leading-[1.12] tracking-wide text-navy">
              Philippine Textile
              <br />
              Research Institute
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-[3px] w-10 rounded-full bg-[#C9A227]" />
              <div className="h-px flex-1 max-w-[140px] bg-gradient-to-r from-[#C9A227]/60 to-transparent" />
            </div>
          </motion.div>

          <motion.h2
            className="relative mt-4 font-extrabold uppercase tracking-tight"
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            <span className="block text-[1.4rem] leading-none">
              <motion.span
                className="bg-gradient-to-r from-accent via-sky-400 to-accent bg-clip-text text-transparent"
                animate={{ opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 2.2, repeat: Infinity }}
              >
                AI
              </motion.span>{' '}
              <span className="text-navy">Color Analysis</span>
            </span>
          </motion.h2>

          <motion.p
            className="relative mt-2.5 text-[0.92rem] font-semibold leading-snug text-navy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Smart Colors. Perfect Style.
            <br />
            Made for You.
          </motion.p>

          <ul className="relative mt-5 max-w-full space-y-3">
            {FEATURE_BULLETS.map((item, index) => {
              const Icon = ICONS[item.id];
              return (
                <motion.li
                  key={item.id}
                  className="flex items-center gap-2.5 bg-transparent py-0.5"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.22 + index * 0.08 }}
                >
                  <motion.span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-navy to-[#1E4D8C] text-white shadow-md"
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.35 }}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </motion.span>
                  <strong className="text-[10.5px] font-extrabold uppercase leading-tight tracking-wide text-navy">
                    {item.title}
                  </strong>
                </motion.li>
              );
            })}
          </ul>
        </div>

        <div className="relative mt-3 max-w-[58%] shrink-0 pb-[34%]">
          <motion.button
            type="button"
            onClick={onStart}
            className="relative flex min-h-[56px] w-full items-center overflow-hidden rounded-2xl bg-gradient-to-r from-navy via-[#16407c] to-navy px-5 text-[1rem] font-extrabold tracking-wide text-white shadow-[0_14px_32px_rgba(11,31,58,0.38)]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.span
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 3 }}
            />
            <span className="relative">TOUCH TO START</span>
            <TouchPulseCue className="absolute -right-2 top-1/2 -translate-y-1/2" />
          </motion.button>
        </div>
      </div>
    </section>
  );
}
