import { useMemo } from 'react';
import { motion } from 'framer-motion';

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface Node {
  x: number;
  y: number;
  r: number;
}

function buildField(count: number): { nodes: Node[]; links: Array<[number, number]> } {
  const nodes: Node[] = Array.from({ length: count }, (_, i) => ({
    x: 6 + hash(i + 1) * 88,
    y: 8 + hash(i + 40) * 84,
    r: 0.7 + hash(i + 80) * 1.4,
  }));
  const links: Array<[number, number]> = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      if (dx * dx + dy * dy < 220) links.push([i, j]);
    }
  }
  return { nodes, links };
}

interface AiAtmosphereProps {
  className?: string;
  density?: number;
}

/** Soft neural mesh + drifting orbs — light “AI product” atmosphere. */
export function AiAtmosphere({ className = '', density = 28 }: AiAtmosphereProps) {
  const field = useMemo(() => buildField(density), [density]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute -left-[20%] top-[-8%] h-56 w-56 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="absolute -right-[10%] top-[18%] h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl" />
      <div className="absolute bottom-[8%] left-[20%] h-40 w-40 rounded-full bg-[#C9A227]/15 blur-3xl" />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {field.links.map(([a, b], i) => (
          <motion.line
            key={`${a}-${b}`}
            x1={field.nodes[a].x}
            y1={field.nodes[a].y}
            x2={field.nodes[b].x}
            y2={field.nodes[b].y}
            stroke="#7EB3E8"
            strokeWidth="0.12"
            initial={{ opacity: 0.08 }}
            animate={{ opacity: [0.06, 0.28, 0.06] }}
            transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.08 }}
          />
        ))}
        {field.nodes.map((n, i) => (
          <motion.circle
            key={i}
            cx={n.x}
            cy={n.y}
            r={n.r * 0.18}
            fill={i % 5 === 0 ? '#C9A227' : '#5BA3E0'}
            animate={{ opacity: [0.2, 0.85, 0.2], r: [n.r * 0.14, n.r * 0.22, n.r * 0.14] }}
            transition={{ duration: 3.2 + (i % 4) * 0.4, repeat: Infinity, delay: i * 0.12 }}
          />
        ))}
      </svg>
    </div>
  );
}

export function AiOrbitRings({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute ${className}`} aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-sky-300/50"
          style={{ inset: `${8 + i * 10}%` }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360, opacity: [0.25, 0.7, 0.25] }}
          transition={{ duration: 14 + i * 4, repeat: Infinity, ease: 'linear' }}
        />
      ))}
      <motion.span
        className="absolute left-1/2 top-[18%] h-2 w-2 -translate-x-1/2 rounded-full bg-sky-300 shadow-[0_0_10px_#7dd3fc]"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '50% 210%' }}
      />
    </div>
  );
}
