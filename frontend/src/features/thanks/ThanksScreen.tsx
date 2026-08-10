import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, FlaskConical, Palette, Sparkles } from 'lucide-react';
import { DostPtriLogo } from '../../shared/ui/DostPtriLogo';

interface ThanksScreenProps {
  name: string;
  onReset: () => void;
}

const RESET_SEC = 12;

const TRUST = [
  { icon: Sparkles, label: 'AI Color Analysis', sub: 'Personalized for you' },
  { icon: Palette, label: 'PTRI Palette', sub: 'Science-backed colors' },
  { icon: FlaskConical, label: 'Textile Match', sub: 'Official PTRI fabrics' },
  { icon: BadgeCheck, label: 'DOST Certified', sub: 'Government research' },
] as const;

/** Floating gold particles — subtle, not blue tech glow */
function GoldParticles() {
  const dots = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: 8 + (i * 9.5) % 88,
    y: 12 + (i * 13) % 75,
    size: 3 + (i % 3),
    delay: i * 0.35,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {dots.map((d) => (
        <motion.span
          key={d.id}
          className="absolute rounded-full bg-[#C9A227]/35"
          style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.size, height: d.size }}
          animate={{ y: [0, -14, 0], opacity: [0.2, 0.65, 0.2] }}
          transition={{ duration: 3.2 + d.id * 0.2, repeat: Infinity, delay: d.delay }}
        />
      ))}
    </div>
  );
}

/** Animated gold ring around the official seal */
function SealRing() {
  return (
    <svg
      className="pointer-events-none absolute -inset-3 h-[calc(100%+24px)] w-[calc(100%+24px)]"
      viewBox="0 0 120 120"
      aria-hidden
    >
      <motion.circle
        cx="60"
        cy="60"
        r="54"
        fill="none"
        stroke="#C9A227"
        strokeWidth="2"
        strokeDasharray="8 6"
        initial={{ pathLength: 0, rotate: 0 }}
        animate={{ pathLength: 1, rotate: 360 }}
        transition={{
          pathLength: { duration: 1.8, ease: 'easeOut' },
          rotate: { duration: 24, repeat: Infinity, ease: 'linear' },
        }}
        style={{ originX: '60px', originY: '60px' }}
      />
    </svg>
  );
}

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
    <section className="relative flex h-full min-h-full flex-col overflow-hidden bg-[#FAFAF8] text-[#0B1F3A]">
      {/* Official header band — government portal style */}
      <div className="relative z-[2] bg-[#0B1F3A] px-6 pb-4 pt-5 text-white shadow-md">
        <div className="h-1 w-full bg-gradient-to-r from-[#C9A227] via-[#E8C547] to-[#C9A227]" />
        <motion.div
          className="mt-4 flex items-center gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DostPtriLogo className="h-11 w-11" />
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/75">
              Republic of the Philippines
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/90">
              Department of Science and Technology
            </p>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#E8C547]">
              Philippine Textile Research Institute
            </p>
          </div>
        </motion.div>
      </div>

      <GoldParticles />

      {/* Main content — clean white, not blue wash */}
      <div className="relative z-[1] flex flex-1 flex-col items-center px-6 pb-6 pt-8 text-center">
        {/* Official seal with animated gold ring */}
        <motion.div
          className="relative mb-6 grid h-[88px] w-[88px] place-items-center"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 16 }}
        >
          <SealRing />
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <DostPtriLogo className="h-[72px] w-[72px]" />
          </motion.div>
        </motion.div>

        {/* Thank you — serif official typography, navy not cyan */}
        <motion.h1
          className="font-['Libre_Baskerville'] text-[2.15rem] font-bold leading-tight text-[#0B1F3A]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {isGuest ? 'Thank You!' : (
            <>
              Thank You,
              <br />
              <span className="text-[#8B6914]">{firstName}!</span>
            </>
          )}
        </motion.h1>

        <motion.div
          className="mx-auto mt-3 h-0.5 w-16 bg-gradient-to-r from-transparent via-[#C9A227] to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.35, duration: 0.6 }}
        />

        <motion.p
          className="mt-4 max-w-[300px] text-[1.05rem] font-semibold leading-snug text-[#334155]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          You&rsquo;ve discovered your perfect colors with PTRI AI Color Analysis.
        </motion.p>

        {/* Trust points — staggered slide-in */}
        <ul className="mt-6 w-full max-w-[340px] space-y-2.5 text-left">
          {TRUST.map((item, i) => (
            <motion.li
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-[#E8E4DA] bg-white px-3.5 py-2.5 shadow-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              whileHover={{ scale: 1.02, borderColor: '#C9A227' }}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#0B1F3A] text-[#E8C547]">
                <item.icon className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div>
                <strong className="block text-[12px] font-extrabold uppercase tracking-wide text-[#0B1F3A]">
                  {item.label}
                </strong>
                <span className="text-[11px] font-medium text-[#64748B]">{item.sub}</span>
              </div>
            </motion.li>
          ))}
        </ul>

        {/* DOST tagline — gold accent */}
        <motion.div
          className="mt-auto w-full pt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95 }}
        >
          <p className="font-['Libre_Baskerville'] text-[1rem] font-bold italic text-[#8B6914]">
            &ldquo;Science for Change.
            <br />
            Solutions for Life.&rdquo;
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
            — Department of Science and Technology
          </p>
        </motion.div>
      </div>

      {/* Footer CTA + countdown */}
      <div className="relative z-[2] border-t border-[#E8E4DA] bg-white px-6 py-4">
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#E8E4DA]">
          <motion.div
            className="h-full bg-gradient-to-r from-[#0B1F3A] to-[#C9A227]"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="mb-3 text-center text-[11px] font-semibold text-[#64748B]">
          Returning to welcome in {secondsLeft}s&hellip;
        </p>
        <motion.button
          type="button"
          className="btn w-full border-2 border-[#0B1F3A] bg-[#0B1F3A] text-white shadow-md"
          onClick={onReset}
          whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(11,31,58,0.25)' }}
          whileTap={{ scale: 0.97 }}
        >
          START NEW SESSION
        </motion.button>
      </div>

      {/* Corner textile motif — navy + gold, not blue blob */}
      <svg
        className="pointer-events-none absolute -bottom-1 -right-1 h-28 w-36 opacity-50"
        viewBox="0 0 140 100"
        aria-hidden
      >
        {[
          ['M10 90 L40 30 L70 90 Z', '#0B1F3A'],
          ['M45 90 L75 20 L105 90 Z', '#C9A227'],
          ['M80 90 L110 40 L140 90 Z', '#1E4D8C'],
          ['M25 90 L55 55 L85 90 Z', '#E8C547'],
        ].map(([d, fill], i) => (
          <motion.path
            key={i}
            d={d}
            fill={fill}
            fillOpacity={0.55}
            animate={{ opacity: [0.4, 0.75, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
      </svg>
    </section>
  );
}
