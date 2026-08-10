import { motion } from 'framer-motion';
import { Cpu, Layers, UserRound } from 'lucide-react';
import { FEATURE_BULLETS } from '../../data/catalog';
import { useLiveClock } from '../../shared/hooks/useLiveClock';
import { DostPtriLogo } from '../../shared/ui/DostPtriLogo';
import { TouchPulseCue } from '../../shared/ui/TouchPulseCue';
import { TrianglePattern } from '../../shared/ui/TrianglePattern';
import { WaveAccent } from '../../shared/ui/WaveAccent';

interface WelcomeScreenProps {
  onStart: () => void;
}

/** Transparent AI face artwork (no baked-in text) */
const FACE_ART = `${import.meta.env.BASE_URL}brand/home-ai-face-cut.png`;

const ICONS = {
  ai: Cpu,
  textiles: Layers,
  personal: UserRound,
} as const;

/** Pulsing mesh nodes over the face artwork */
function FaceMeshPulse({ className = '' }: { className?: string }) {
  const nodes: Array<[number, number]> = [
    [28, 10], [50, 6], [70, 14], [84, 28], [64, 24], [42, 20],
    [76, 44], [58, 40], [86, 60], [68, 64], [80, 80], [62, 86],
    [88, 94], [72, 12], [90, 36],
  ];
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden="true">
      {nodes.map(([x, y], i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.9)]"
          style={{ left: `${x}%`, top: `${y}%` }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.5, 0.8] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.14 }}
        />
      ))}
    </div>
  );
}

/** Home rebuilt 1:1 from the approved design — real components, no screenshot background */
export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const { time, day } = useLiveClock();

  return (
    <section className="relative flex h-full min-h-full flex-col overflow-hidden bg-gradient-to-b from-white via-[#F6FAFE] to-[#EDF3FA] px-5 pb-6 pt-5">
      {/* Right-side AI face artwork (transparent PNG, not a screenshot) */}
      <motion.div
        className="pointer-events-none absolute -right-[16%] top-[4%] h-[62%] w-[75%]"
        style={{
          maskImage:
            'linear-gradient(to bottom, black 0%, black 62%, transparent 96%), linear-gradient(to right, transparent 0%, black 22%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black 62%, transparent 96%), linear-gradient(to right, transparent 0%, black 22%)',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.img
          src={FACE_ART}
          alt=""
          className="h-full w-full object-contain object-right drop-shadow-[0_0_30px_rgba(56,189,248,0.35)]"
          draggable={false}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <FaceMeshPulse className="absolute inset-y-[8%] right-[6%] w-[58%]" />
        {/* scan shimmer */}
        <motion.div
          className="absolute inset-x-[28%] h-10 rounded-full bg-gradient-to-b from-transparent via-sky-300/40 to-transparent"
          animate={{ top: ['10%', '78%', '10%'] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Header */}
      <header className="relative z-[3] mb-7 flex items-start justify-between gap-3">
        <motion.div
          className="flex min-w-0 items-center gap-2.5"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DostPtriLogo className="h-[56px] w-[56px] shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold leading-[1.25] text-navy">
              Department of Science and Technology
            </p>
            <p className="text-[9px] font-bold uppercase leading-[1.25] text-navy">
              Philippine Textile Research Institute
            </p>
            <p className="mt-0.5 text-[15px] font-extrabold leading-none text-navy">DOST-PTRI</p>
          </div>
        </motion.div>
        <motion.div
          className="shrink-0 pt-1 text-right"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-[15px] font-extrabold leading-none text-navy">{time}</div>
          <div className="mt-1 text-[11px] font-semibold text-navy">{day}</div>
        </motion.div>
      </header>

      {/* Hero text */}
      <div className="relative z-[3] max-w-[62%]">
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
      <ul className="relative z-[3] mt-8 space-y-4">
        {FEATURE_BULLETS.map((item, index) => {
          const Icon = ICONS[item.id];
          return (
            <motion.li
              key={item.id}
              className="flex items-center gap-3.5"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + index * 0.1 }}
            >
              <motion.span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-white"
                animate={{ scale: [1, 1.07, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.35 }}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </motion.span>
              <strong className="text-[1.02rem] font-extrabold text-navy">{item.title}</strong>
            </motion.li>
          );
        })}
      </ul>

      {/* Bottom art + CTA */}
      <div className="relative z-[3] mt-auto pt-12">
        <WaveAccent className="absolute -bottom-3 -left-5 h-[200px] w-full opacity-75" />
        <TrianglePattern className="absolute -bottom-2 -right-6 h-[180px] w-[210px]" />

        <motion.button
          type="button"
          onClick={onStart}
          className="relative z-[2] flex min-h-[58px] w-[min(100%,330px)] items-center rounded-2xl bg-navy px-6 text-[1.05rem] font-extrabold tracking-wide text-white shadow-[0_14px_30px_rgba(11,31,58,0.35)]"
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
