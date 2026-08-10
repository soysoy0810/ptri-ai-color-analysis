import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { DostPtriLogo } from '../../shared/ui/DostPtriLogo';
import { TrianglePattern } from '../../shared/ui/TrianglePattern';

interface ThanksScreenProps {
  name: string;
  onReset: () => void;
}

const AI_ART = `${import.meta.env.BASE_URL}brand/thanks-ai-art.png`;

/**
 * Thank You board screen — deep navy + AI head artwork on the right,
 * cyan "THANK YOU!", white discovery line, DOST taglines bottom-left.
 */
export function ThanksScreen({ name, onReset }: ThanksScreenProps) {
  useEffect(() => {
    const t = window.setTimeout(onReset, 9000);
    return () => window.clearTimeout(t);
  }, [onReset]);

  const firstName = name.trim().split(/\s+/)[0];
  const isGuest = !firstName || firstName.toLowerCase() === 'guest';

  return (
    <section className="relative flex h-full min-h-full flex-col overflow-hidden bg-[#071526] px-6 pb-7 pt-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#071526] via-[#0b1f3a] to-[#123a6b]" />

      <motion.img
        src={AI_ART}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-8 bottom-0 top-[8%] w-[92%] max-w-[540px] object-contain object-right"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 22%)',
          maskImage: 'linear-gradient(to right, transparent 0%, black 22%)',
        }}
        initial={{ opacity: 0, x: 36 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.05, ease: 'easeOut' }}
        draggable={false}
      />

      <motion.div
        className="pointer-events-none absolute -right-16 top-20 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl"
        animate={{ opacity: [0.3, 0.65, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <TrianglePattern className="absolute -right-2 top-0 h-24 w-32 rotate-180 opacity-55" />
      <TrianglePattern className="absolute -bottom-3 -right-2 h-36 w-44 opacity-60" />

      <motion.div
        className="relative z-[1] flex items-center gap-3"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <DostPtriLogo className="h-12 w-12" />
        <div className="text-[9px] font-bold uppercase leading-snug tracking-wide text-white/80">
          Department of Science and Technology
          <br />
          Philippine Textile Research Institute
          <br />
          <span className="text-[13px] font-extrabold tracking-[0.14em] text-white">DOST-PTRI</span>
        </div>
      </motion.div>

      <div className="relative z-[1] mt-[26vh] max-w-[300px]">
        <motion.h1
          className="text-[2.65rem] font-extrabold uppercase leading-none tracking-tight text-[#7dd3fc]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          {isGuest ? 'Thank You!' : `Thank You, ${firstName}!`}
        </motion.h1>

        <motion.p
          className="mt-3 text-[1.55rem] font-extrabold leading-[1.15] text-white"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
        >
          You&rsquo;ve discovered your perfect colors.
        </motion.p>
      </div>

      <div className="relative z-[1] mt-auto">
        <motion.p
          className="text-[1.05rem] font-semibold leading-relaxed text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Science for Change.
          <br />
          Solutions for Life.
        </motion.p>

        <motion.button
          type="button"
          className="btn mt-5 w-full border border-white/25 bg-white/95 text-navy"
          onClick={onReset}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          whileTap={{ scale: 0.97 }}
        >
          START NEW SESSION
        </motion.button>
      </div>
    </section>
  );
}
