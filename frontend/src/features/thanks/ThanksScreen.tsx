import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DostPtriLogo } from '../../shared/ui/DostPtriLogo';

interface ThanksScreenProps {
  name: string;
  onReset: () => void;
}

const AI_ART = `${import.meta.env.BASE_URL}brand/thanks-ai-art.png`;
const RESET_SEC = 12;

const TRUST = [
  'AI-Powered Color Analysis',
  'PTRI Textile Match',
  'Science for Change',
] as const;

export function ThanksScreen({ name, onReset }: ThanksScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(RESET_SEC);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(tick);
          onReset();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [onReset]);

  const firstName = name.trim().split(/\s+/)[0];
  const isGuest = !firstName || firstName.toLowerCase() === 'guest';
  const progress = ((RESET_SEC - secondsLeft) / RESET_SEC) * 100;

  return (
    <section className="relative flex h-full min-h-full flex-col overflow-hidden bg-[#FAFAF8]">
      {/* Official header — government band, not full-screen blue */}
      <div className="relative z-[3] bg-[#0B1F3A] px-5 pb-3 pt-4 text-white shadow-lg">
        <div className="h-1 bg-gradient-to-r from-[#C9A227] via-[#E8C547] to-[#C9A227]" />
        <motion.div
          className="mt-3 flex items-center gap-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DostPtriLogo className="h-10 w-10" />
          <div className="text-[8.5px] font-bold uppercase leading-snug tracking-wide text-white/85">
            Republic of the Philippines · Department of Science and Technology
            <br />
            Philippine Textile Research Institute
            <br />
            <span className="text-[12px] font-extrabold tracking-[0.12em] text-[#E8C547]">DOST-PTRI</span>
          </div>
        </motion.div>
      </div>

      {/* Content area — warm white, AI art on right */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Soft navy wash only behind AI art, not whole screen */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[72%] bg-gradient-to-l from-[#0B1F3A]/90 via-[#123a6b]/50 to-transparent" />

        <motion.img
          src={AI_ART}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-6 bottom-0 top-[2%] w-[88%] max-w-[480px] object-contain object-right"
          style={{
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 28%)',
            maskImage: 'linear-gradient(to right, transparent 0%, black 28%)',
          }}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: [0, -6, 0] }}
          transition={{
            opacity: { duration: 1 },
            x: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
          }}
          draggable={false}
        />

        {/* Floating gold particles */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute rounded-full bg-[#C9A227]"
            style={{
              right: `${12 + i * 14}%`,
              top: `${20 + i * 12}%`,
              width: 3 + (i % 2),
              height: 3 + (i % 2),
            }}
            animate={{ y: [0, -12, 0], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
            aria-hidden
          />
        ))}

        {/* Left copy block */}
        <div className="relative z-[2] flex flex-1 flex-col px-6 pb-4 pt-8">
          <motion.h1
            className="max-w-[280px] font-['Libre_Baskerville'] text-[2.4rem] font-bold uppercase leading-[1.05] tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {isGuest ? (
              <span className="text-[#0B1F3A]">Thank You!</span>
            ) : (
              <>
                <span className="text-[#0B1F3A]">Thank You,</span>
                <br />
                <motion.span
                  className="bg-gradient-to-r from-[#C9A227] to-[#8B6914] bg-clip-text text-transparent"
                  animate={{ opacity: [0.85, 1, 0.85] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  {firstName}!
                </motion.span>
              </>
            )}
          </motion.h1>

          <motion.div
            className="mt-3 h-0.5 w-14 bg-gradient-to-r from-[#C9A227] to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          />

          <motion.p
            className="mt-4 max-w-[260px] text-[1.2rem] font-bold leading-snug text-[#334155]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            You&rsquo;ve discovered your perfect colors.
          </motion.p>

          {/* Trust badges — fills the empty bottom area */}
          <ul className="mt-6 space-y-2">
            {TRUST.map((label, i) => (
              <motion.li
                key={label}
                className="flex items-center gap-2.5 rounded-lg border border-[#E8E4DA] bg-white/90 px-3 py-2 text-[12px] font-bold uppercase tracking-wide text-[#0B1F3A] shadow-sm backdrop-blur-sm"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.12 }}
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#C9A227] text-[10px] text-white">
                  ✓
                </span>
                {label}
              </motion.li>
            ))}
          </ul>

          <motion.blockquote
            className="mt-auto pt-6 font-['Libre_Baskerville'] text-[0.95rem] font-bold italic text-[#8B6914]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            &ldquo;Science for Change.
            <br />
            Solutions for Life.&rdquo;
          </motion.blockquote>
        </div>
      </div>

      {/* Footer — no more empty void */}
      <div className="relative z-[3] border-t border-[#E8E4DA] bg-white px-6 py-4 shadow-[0_-8px_24px_rgba(11,31,58,0.06)]">
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-[#E8E4DA]">
          <motion.div
            className="h-full bg-gradient-to-r from-[#0B1F3A] to-[#C9A227]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mb-3 text-center text-[11px] font-semibold text-[#64748B]">
          New session in {secondsLeft}s
        </p>
        <motion.button
          type="button"
          className="btn w-full border-2 border-[#0B1F3A] bg-[#0B1F3A] text-white"
          onClick={onReset}
          whileHover={{ scale: 1.02, boxShadow: '0 8px 20px rgba(11,31,58,0.2)' }}
          whileTap={{ scale: 0.97 }}
        >
          START NEW SESSION
        </motion.button>
      </div>
    </section>
  );
}
