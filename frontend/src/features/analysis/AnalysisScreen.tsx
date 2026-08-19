import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SkinProfile } from '../../shared/lib/colorEngine';
import { depthLabel, explainColorFit, undertoneLabel } from '../../shared/lib/colorEngine';
import type { PaletteColor } from '../../shared/lib/types';

interface AnalysisScreenProps {
  skinProfile: SkinProfile | null;
  top20: PaletteColor[];
  onDone: () => void;
}

const ANALYSIS_MS = 1100;

const RING_R = 78;
const RING_CX = 110;
const RING_CY = 110;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

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

function buildParticles(): Particle[] {
  const particles: Particle[] = [];
  const tailDeg = 205;

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

function AiParticleRing() {
  const particles = useMemo(buildParticles, []);
  const arcLength = CIRCUMFERENCE * 0.74;

  return (
    <div className="relative mx-auto h-[220px] w-[220px]">
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

      <div className="absolute inset-[44px] grid place-items-center rounded-full bg-[#0b1f3a] shadow-[0_14px_34px_rgba(27,79,156,0.28)]">
        <motion.span
          className="px-3 text-center text-[13px] font-extrabold uppercase leading-tight tracking-wide text-white"
          animate={{ opacity: [0.7, 1, 0.7], scale: [0.98, 1.03, 0.98] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          AI
          <br />
          Processing
        </motion.span>
      </div>
    </div>
  );
}

export function AnalysisScreen({ skinProfile, top20, onDone }: AnalysisScreenProps) {
  const facts = useMemo(() => {
    const tone = skinProfile ? `${undertoneLabel(skinProfile.undertone)} undertone` : 'skin sample pending';
    const depth = skinProfile ? `${depthLabel(skinProfile.depth)} depth` : 'depth pending';
    const ita = skinProfile ? `ITA ${skinProfile.ita}` : 'calibrating';
    const conf = skinProfile ? `confidence ${Math.round(skinProfile.confidence)}%` : '';
    const best = top20[0];
    return [
      `Camera-based analysis · ${ita}${conf ? ` · ${conf}` : ''}`,
      `Classified ${tone}, ${depth}`,
      best ? explainColorFit(best, skinProfile) : 'Ranking catalog colors against your skin profile',
      `${top20.length || 20} colors ranked by contrast, undertone harmony and chroma`,
    ];
  }, [skinProfile, top20]);

  useEffect(() => {
    const t = window.setTimeout(onDone, ANALYSIS_MS);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <section className="screen items-center justify-center text-center">
      <span className="ai-chip mb-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
        Camera-based color analysis
      </span>
      <motion.h1
        className="screen-title mb-2 w-full max-w-[320px] text-center leading-snug"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Our AI is analyzing your features, undertone and natural coloring...
      </motion.h1>

      <div className="my-8">
        <AiParticleRing />
      </div>

      <ul className="mb-6 w-full max-w-[320px] space-y-2 text-left text-[13px] font-semibold text-navy">
        {facts.map((label, i) => (
          <motion.li
            key={label}
            className="flex items-start gap-2"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.55 }}
          >
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-[10px] font-extrabold text-white">
              ✓
            </span>
            <span className="leading-snug">{label}</span>
          </motion.li>
        ))}
      </ul>

      <div className="relative mt-2 h-12 w-full max-w-[320px] overflow-hidden rounded-xl bg-navy">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400 to-accent"
          initial={{ width: '18%' }}
          animate={{ width: ['18%', '92%', '18%'] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <p className="relative z-[1] grid h-full place-items-center text-sm font-extrabold text-white">
          {skinProfile ? 'Analysis complete' : 'Analyzing...'}
        </p>
      </div>
    </section>
  );
}
