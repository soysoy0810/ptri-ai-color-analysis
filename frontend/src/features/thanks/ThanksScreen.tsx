import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Cpu, FlaskConical, Palette } from 'lucide-react';
import { DostPtriLogo } from '../../shared/ui/DostPtriLogo';
import { TouchPulseCue } from '../../shared/ui/TouchPulseCue';
import { useLiveClock } from '../../shared/hooks/useLiveClock';

interface ThanksScreenProps {
  name: string;
  onReset: () => void;
}

/** Art-only AI profile board — no home UI baked in */
const AI_ART = `${import.meta.env.BASE_URL}brand/home-art-clean.png`;
const RESET_SEC = 12;

const TRUST = [
  { icon: Cpu, label: 'AI-Powered Color Analysis' },
  { icon: Palette, label: 'PTRI Textile Match' },
  { icon: FlaskConical, label: 'Science for Change' },
] as const;

const MESH_NODES: Array<[number, number]> = [
  [30, 10], [52, 6], [72, 13], [86, 27], [66, 23], [44, 19],
  [78, 43], [60, 39], [88, 59], [70, 63], [82, 79], [64, 85],
  [90, 93], [74, 11], [92, 35],
];

const MESH_EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
  [2, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11],
  [6, 13], [13, 14], [14, 3], [7, 4], [11, 10],
];

function FaceMeshPulse({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden>
      {MESH_NODES.map(([x, y], i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-sky-200 shadow-[0_0_10px_rgba(125,211,252,0.95)]"
          style={{ left: `${x}%`, top: `${y}%` }}
          animate={{ opacity: [0.15, 1, 0.15], scale: [0.8, 1.7, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

/** Animated neural mesh lines over the AI profile */
function NeuralMeshLines({ className = '' }: { className?: string }) {
  return (
    <svg className={`pointer-events-none ${className}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {MESH_EDGES.map(([a, b], i) => {
        const [x1, y1] = MESH_NODES[a];
        const [x2, y2] = MESH_NODES[b];
        return (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(186,230,253,0.55)"
            strokeWidth="0.35"
            animate={{ opacity: [0.15, 0.65, 0.15] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
          />
        );
      })}
    </svg>
  );
}

function formatFirstName(raw: string): string {
  const part = raw.trim().split(/\s+/)[0];
  if (!part) return '';
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

export function ThanksScreen({ name, onReset }: ThanksScreenProps) {
  const { time, day } = useLiveClock();
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

  const firstName = formatFirstName(name);
  const isGuest = !firstName || firstName.toLowerCase() === 'guest';
  const progress = ((RESET_SEC - secondsLeft) / RESET_SEC) * 100;

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white px-6 pb-6 pt-5">
      {/* Living AI background — profile art + mesh + shimmer (right side) */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[58%] overflow-hidden">
        <motion.img
          src={AI_ART}
          alt=""
          className="absolute inset-0 h-full w-[215%] max-w-none object-cover object-[left_center]"
          draggable={false}
          animate={{ scale: [1, 1.02, 1], x: [0, -4, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white via-white/90 to-transparent" />
      </div>

      <FaceMeshPulse className="absolute right-0 top-[4%] z-[1] h-[46%] w-[44%]" />
      <NeuralMeshLines className="absolute right-0 top-[4%] z-[1] h-[46%] w-[44%]" />
      <motion.div
        className="pointer-events-none absolute right-0 top-[5%] z-[1] h-[50%] w-[40%] rounded-full bg-gradient-to-b from-transparent via-sky-300/22 to-transparent"
        animate={{ y: ['-6%', '10%', '-6%'], opacity: [0.12, 0.45, 0.12] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-transparent via-white/12 to-transparent"
        animate={{ x: ['-120%', '120%'] }}
        transition={{ duration: 3.6, repeat: Infinity, repeatDelay: 4.5, ease: 'easeInOut' }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute bottom-[18%] left-0 z-[1] h-20 w-[50%] bg-gradient-to-r from-sky-200/25 via-accent/10 to-transparent"
        animate={{ opacity: [0.25, 0.55, 0.25], x: [0, 10, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />

      <header className="relative z-[3] mb-8 flex shrink-0 items-start justify-between gap-3 sm:mb-10">
        <motion.div
          className="flex min-w-0 items-center gap-2.5"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DostPtriLogo className="h-[50px] w-[50px] shrink-0" />
          <div className="min-w-0">
            <p className="text-[8px] font-bold leading-[1.25] text-navy">
              Department of Science and Technology
            </p>
            <p className="text-[9.5px] font-extrabold uppercase leading-[1.3] tracking-wide text-navy">
              Philippine Textile Research Institute
            </p>
          </div>
        </motion.div>
        <motion.div className="shrink-0 pt-0.5 text-right" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-[14px] font-extrabold leading-none text-navy">{time}</div>
          <div className="mt-1 text-[10px] font-semibold text-navy">{day}</div>
        </motion.div>
      </header>

      <div className="relative z-[3] mt-2 shrink-0 max-w-[62%] sm:mt-4">
        <motion.h1
          className="font-['Libre_Baskerville'] font-bold uppercase leading-[1.08] tracking-tight text-navy"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {isGuest ? (
            <span className="text-[2.4rem]">Thank You!</span>
          ) : (
            <span className="text-[2rem] sm:text-[2.2rem]">
              Thank You,{' '}
              <motion.span
                className="text-[#C9A227]"
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {firstName}!
              </motion.span>
            </span>
          )}
        </motion.h1>

        <motion.div
          className="mt-2 h-[2px] w-14 bg-gradient-to-r from-[#C9A227] to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        />

        <motion.p
          className="mt-3 text-[1.05rem] font-bold leading-snug text-navy"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          You&rsquo;ve discovered your perfect colors.
        </motion.p>
      </div>

      <ul className="relative z-[3] mt-4 shrink-0 space-y-2.5 max-w-[62%]">
        {TRUST.map((item, i) => (
          <motion.li
            key={item.label}
            className="flex items-center gap-3 rounded-2xl border border-sky-100/80 bg-white/92 px-3 py-2.5 shadow-sm backdrop-blur-[2px]"
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            whileHover={{ scale: 1.02, borderColor: '#C9A227' }}
          >
            <motion.span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-white"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.35 }}
            >
              <item.icon className="h-4 w-4" strokeWidth={2.2} />
            </motion.span>
            <strong className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
              {item.label}
            </strong>
            <motion.span
              className="ml-auto grid h-5 w-5 place-items-center rounded-full bg-[#C9A227]/15 text-[#8B6914]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.12, type: 'spring' }}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </motion.span>
          </motion.li>
        ))}
      </ul>

      <div className="relative z-[3] mt-5 shrink-0 pb-2">
        <motion.blockquote
          className="mb-3 font-['Libre_Baskerville'] text-[0.95rem] font-bold italic leading-snug text-[#8B6914]"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          &ldquo;Science for Change.
          <br />
          Solutions for Life.&rdquo;
        </motion.blockquote>

        <div className="mb-2 h-1 overflow-hidden rounded-full bg-sky-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-navy to-[#C9A227]"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <p className="mb-3 text-[10px] font-semibold text-navy/70">
          Returning to welcome in {secondsLeft}s&hellip;
        </p>

        <motion.button
          type="button"
          onClick={onReset}
          className="relative flex min-h-[54px] w-full items-center rounded-2xl bg-gradient-to-r from-navy to-[#16407c] px-5 text-sm font-extrabold tracking-wide text-white shadow-[0_12px_28px_rgba(11,31,58,0.35)]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02, boxShadow: '0 16px 32px rgba(11,31,58,0.4)' }}
          whileTap={{ scale: 0.97 }}
        >
          <span>START NEW SESSION</span>
          <TouchPulseCue className="absolute -right-1 top-1/2 -translate-y-1/2 scale-75" />
        </motion.button>
      </div>
    </section>
  );
}
