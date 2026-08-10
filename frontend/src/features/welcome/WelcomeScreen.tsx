import { motion } from 'framer-motion';
import { Cpu, Layers, UserRound } from 'lucide-react';
import { FEATURE_BULLETS } from '../../data/catalog';
import { useLiveClock } from '../../shared/hooks/useLiveClock';
import { AiNetworkFace } from '../../shared/ui/AiNetworkFace';
import { DostPtriLogo } from '../../shared/ui/DostPtriLogo';
import { TouchPulseCue } from '../../shared/ui/TouchPulseCue';
import { TrianglePattern } from '../../shared/ui/TrianglePattern';
import { WaveAccent } from '../../shared/ui/WaveAccent';

interface WelcomeScreenProps {
  onStart: () => void;
}

const ICONS = {
  ai: Cpu,
  textiles: Layers,
  personal: UserRound,
} as const;

/** Real interactive home UI — components + motion (not a background poster) */
export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const { time, day } = useLiveClock();

  return (
    <section className="relative flex h-full min-h-full flex-col overflow-hidden bg-white px-5 pb-6 pt-5">
      {/* Soft ambient glow only — not a full-screen picture */}
      <motion.div
        className="pointer-events-none absolute -right-10 top-24 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl"
        animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.08, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Header */}
      <header className="relative z-[3] mb-6 flex items-start justify-between gap-3">
        <motion.div
          className="flex min-w-0 items-center gap-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DostPtriLogo className="h-[62px] w-[62px] shrink-0" />
          <div className="min-w-0">
            <p className="text-[8.5px] font-bold uppercase leading-[1.2] tracking-[0.03em] text-navy">
              Department of Science and Technology
            </p>
            <p className="text-[8.5px] font-bold uppercase leading-[1.2] tracking-[0.03em] text-navy">
              Philippine Textile Research Institute
            </p>
            <p className="mt-1 text-[16px] font-extrabold leading-none text-navy">DOST-PTRI</p>
          </div>
        </motion.div>

        <motion.div
          className="shrink-0 rounded-xl bg-accent-soft px-3 py-2 text-right"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-[15px] font-extrabold leading-none text-navy">{time}</div>
          <div className="mt-1 text-[11px] font-semibold text-navy">{day}</div>
        </motion.div>
      </header>

      {/* Hero: real text + animated AI mesh */}
      <div className="relative z-[2] mb-5 min-h-[250px]">
        <div className="relative z-[1] max-w-[56%]">
          <motion.h1
            className="font-extrabold uppercase tracking-tight"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="block text-[3.4rem] leading-[0.92] text-navy">PTRI</span>
            <span className="mt-1 block text-[1.4rem] leading-[1.1]">
              <motion.span
                className="inline-block text-accent"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
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

        <AiNetworkFace className="pointer-events-none absolute -right-3 top-[-24px] h-[300px] w-[235px]" />
      </div>

      {/* Feature list — real buttons/rows */}
      <ul className="relative z-[2] space-y-3.5">
        {FEATURE_BULLETS.map((item, index) => {
          const Icon = ICONS[item.id];
          return (
            <motion.li
              key={item.id}
              className="flex items-center gap-3.5"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <motion.span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-white"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.35 }}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </motion.span>
              <strong className="text-[1.02rem] font-extrabold text-navy">{item.title}</strong>
            </motion.li>
          );
        })}
      </ul>

      {/* Bottom: animated accents + real CTA button */}
      <div className="relative mt-auto pt-12">
        <WaveAccent className="absolute bottom-6 left-0 h-[210px] w-full opacity-80" />
        <TrianglePattern className="absolute -bottom-1 -right-5 h-[190px] w-[220px]" />

        <motion.button
          type="button"
          onClick={onStart}
          className="relative z-[3] flex min-h-[58px] w-[min(100%,340px)] items-center rounded-2xl bg-navy px-6 text-[1.05rem] font-extrabold tracking-wide text-white shadow-[0_14px_30px_rgba(11,31,58,0.28)]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>TOUCH TO START</span>
          <TouchPulseCue className="absolute -right-2 top-1/2 -translate-y-1/2" />
        </motion.button>
      </div>
    </section>
  );
}
