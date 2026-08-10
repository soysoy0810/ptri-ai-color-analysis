import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface AnalysisScreenProps {
  onDone: () => void;
}

const ANALYSIS_MS = 4600;

const RING_R = 78;
const RING_CX = 110;
const RING_CY = 110;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

/** Deterministic pseudo-random, so the particle cloud is stable between renders */
function prand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface Particle {
  x: number;
  y: number;
  r: number;
  opacity: number;
  delay: number;
}

/** Particles continuing past the arc tail (top-left), dissolving outward like the mockup */
function buildParticles(): Particle[] {
  const particles: Particle[] = [];
  const tailDeg = 205; // arc tail angle, SVG degrees (0 = right, counter-clockwise negative)

  for (let i = 0; i < 26; i += 1) {
    const angle = ((tailDeg + i * 4.4) * Math.PI) / 180;
    const scatter = (prand(i) - 0.5) * (6 + i * 1.7);
    const radius = RING_R + scatter;
    particles.push({
      x: RING_CX + radius * Math.cos(angle),
      y: RING_CY - radius * Math.sin(angle),
      r: Math.max(1.4, 6.4 - i * 0.2 + prand(i + 40) * 1.6),
      opacity: Math.max(0.25, 1 - i * 0.03),
      delay: i * 0.05,
    });
  }

  // loose speckle cloud drifting away to the upper-left
  for (let i = 0; i < 18; i += 1) {
    const angle = ((198 + prand(i + 80) * 55) * Math.PI) / 180;
    const radius = RING_R + 14 + prand(i + 120) * 34;
    particles.push({
      x: RING_CX + radius * Math.cos(angle),
      y: RING_CY - radius * Math.sin(angle),
      r: 1.2 + prand(i + 160) * 2.6,
      opacity: 0.2 + prand(i + 200) * 0.5,
      delay: prand(i + 240) * 1.2,
    });
  }

  return particles;
}

/** Blue gradient ring dissolving into particles at the tip — matches the approved board */
function AiParticleRing() {
  const particles = useMemo(buildParticles, []);
  const arcLength = CIRCUMFERENCE * 0.74;

  return (
    <div className="relative mx-auto h-[220px] w-[220px]">
      {/* soft breathing halo */}
      <motion.div
        className="absolute inset-3 rounded-full bg-accent/10 blur-xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.svg
        viewBox="0 0 220 220"
        className="absolute inset-0 h-full w-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        <defs>
          <linearGradient id="ai-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67c3f0" />
            <stop offset="45%" stopColor="#2f80ed" />
            <stop offset="100%" stopColor="#1b4f9c" />
          </linearGradient>
        </defs>

        {/* main arc with rounded ends; the gap sits where the particles take over */}
        <circle
          cx={RING_CX}
          cy={RING_CY}
          r={RING_R}
          fill="none"
          stroke="url(#ai-ring-grad)"
          strokeWidth={26}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${CIRCUMFERENCE - arcLength}`}
          transform={`rotate(-155 ${RING_CX} ${RING_CY})`}
        />

        {/* dissolve particles at the arc tail */}
        {particles.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.r}
            fill={i % 3 === 0 ? '#67c3f0' : '#2f80ed'}
            initial={{ opacity: p.opacity * 0.7 }}
            animate={{ opacity: [0, p.opacity, p.opacity * 0.35, p.opacity] }}
            transition={{ duration: 2.1, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          />
        ))}
      </motion.svg>

      {/* white core with AI monogram */}
      <div className="absolute inset-[44px] grid place-items-center rounded-full bg-white shadow-[0_14px_34px_rgba(27,79,156,0.18)]">
        <motion.span
          className="text-[42px] font-extrabold tracking-tight text-[#1b4f9c]"
          animate={{ opacity: [0.7, 1, 0.7], scale: [0.98, 1.03, 0.98] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          AI
        </motion.span>
      </div>
    </div>
  );
}

function ProgressDots() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: '#0b1f3a' }}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.35 }}
        />
      ))}
    </div>
  );
}

export function AnalysisScreen({ onDone }: AnalysisScreenProps) {
  useEffect(() => {
    const t = window.setTimeout(onDone, ANALYSIS_MS);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <section className="screen items-center justify-center text-center">
      <motion.h1
        className="screen-title mb-2 w-full max-w-[320px] text-center leading-snug"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        AI is analyzing your natural color attributes...
      </motion.h1>

      <div className="my-10">
        <AiParticleRing />
      </div>

      <motion.p
        className="mb-8 text-[16px] font-semibold text-muted"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        Please wait a moment
      </motion.p>

      <ProgressDots />
    </section>
  );
}
