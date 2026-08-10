import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Cpu, FlaskConical, Lock, UserRound } from 'lucide-react';
import { DostPtriLogo } from '../../shared/ui/DostPtriLogo';
import { TrianglePattern } from '../../shared/ui/TrianglePattern';

interface ThanksScreenProps {
  name: string;
  onReset: () => void;
}

const TRUST_POINTS = [
  { icon: Cpu, title: 'AI-POWERED', sub: 'Accurate & Reliable' },
  { icon: FlaskConical, title: 'SCIENCE-BASED', sub: 'Color Matching' },
  { icon: UserRound, title: 'PERSONALIZED', sub: 'Just for You' },
  { icon: BadgeCheck, title: 'PTRI TEXTILES', sub: 'Trusted Quality' },
  { icon: Lock, title: 'SECURE & PRIVATE', sub: 'Your Data is Safe' },
] as const;

export function ThanksScreen({ name, onReset }: ThanksScreenProps) {
  useEffect(() => {
    const t = window.setTimeout(onReset, 9000);
    return () => window.clearTimeout(t);
  }, [onReset]);

  const firstName = name.trim().split(/\s+/)[0];
  const isGuest = !firstName || firstName.toLowerCase() === 'guest';

  return (
    <section className="relative flex h-full min-h-full flex-col overflow-hidden bg-gradient-to-b from-navy via-[#0d2a52] to-[#0a1f3d] px-6 pb-8 pt-10 text-white">
      {/* ambient glow */}
      <motion.div
        className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <motion.h1
        className="text-[2.6rem] font-extrabold uppercase tracking-tight"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {isGuest ? 'Thank You!' : `Thank You, ${firstName}!`}
      </motion.h1>

      <motion.p
        className="mt-3 max-w-[320px] text-[1.05rem] font-semibold leading-relaxed text-white/90"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        Thank you for using PTRI AI Color Analysis Kiosk! We hope you enjoyed the experience.
      </motion.p>

      <motion.p
        className="mt-5 text-[1rem] font-extrabold text-sky-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Science for Change.
        <br />
        Solutions for Life.
      </motion.p>

      {/* Trust points */}
      <ul className="mt-8 space-y-3.5">
        {TRUST_POINTS.map((point, i) => (
          <motion.li
            key={point.title}
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.1 }}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-sky-300/40 bg-white/5 text-sky-300">
              <point.icon className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <div>
              <strong className="block text-[13px] font-extrabold tracking-wide">
                {point.title}
              </strong>
              <span className="text-[12px] font-medium text-white/70">{point.sub}</span>
            </div>
          </motion.li>
        ))}
      </ul>

      <div className="mt-auto">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <DostPtriLogo className="h-12 w-12" />
          <div>
            <strong className="block text-[15px] font-extrabold">DOST-PTRI</strong>
            <span className="text-[11px] font-medium text-white/70">
              Empowering Textiles. Enhancing Lives.
            </span>
          </div>
        </motion.div>

        <motion.button
          type="button"
          className="btn mt-6 w-full bg-white text-navy"
          onClick={onReset}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          whileTap={{ scale: 0.97 }}
        >
          START NEW SESSION
        </motion.button>
      </div>

      <TrianglePattern className="absolute -bottom-2 -right-4 h-36 w-44 opacity-40" />
    </section>
  );
}
