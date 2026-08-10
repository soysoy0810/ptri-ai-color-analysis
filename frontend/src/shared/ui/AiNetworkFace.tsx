import { motion } from 'framer-motion';

interface AiNetworkFaceProps {
  className?: string;
}

/** Live animated AI face mesh — real SVG UI, not a static poster */
export function AiNetworkFace({ className = '' }: AiNetworkFaceProps) {
  const nodes: Array<[number, number]> = [
    [150, 42],
    [128, 58],
    [112, 78],
    [108, 102],
    [120, 118],
    [98, 132],
    [106, 150],
    [122, 164],
    [136, 178],
    [148, 198],
    [158, 220],
    [172, 242],
    [188, 255],
    [198, 70],
    [210, 100],
    [214, 135],
    [208, 170],
    [196, 205],
    [168, 95],
    [178, 125],
    [164, 145],
    [152, 120],
  ];

  const edges: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [0, 13],
    [13, 14],
    [14, 15],
    [15, 16],
    [16, 17],
    [17, 11],
    [3, 18],
    [18, 19],
    [19, 20],
    [20, 7],
    [4, 21],
    [21, 18],
    [21, 20],
    [19, 16],
    [14, 18],
  ];

  const facePath =
    'M220 30 C185 16 150 22 128 48 C112 68 106 92 108 114 ' +
    'C100 128 88 138 90 150 C94 162 104 168 112 176 ' +
    'C120 188 128 202 138 218 C148 236 160 250 178 262 ' +
    'L220 268 Z';

  return (
    <motion.svg
      className={className}
      viewBox="0 0 240 300"
      fill="none"
      aria-hidden="true"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      <defs>
        <linearGradient id="faceFill" x1="90" y1="20" x2="220" y2="270" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7EC2FF" />
          <stop offset="0.4" stopColor="#2F80ED" />
          <stop offset="1" stopColor="#0B1F3A" />
        </linearGradient>
        <linearGradient id="scanGlow" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#7DD3FC" stopOpacity="0" />
          <stop offset="0.5" stopColor="#7DD3FC" stopOpacity="0.65" />
          <stop offset="1" stopColor="#7DD3FC" stopOpacity="0" />
        </linearGradient>
        <clipPath id="faceClipUi">
          <path d={facePath} />
        </clipPath>
      </defs>

      <ellipse cx="170" cy="150" rx="78" ry="115" fill="#2F80ED" opacity="0.12" />
      <path d={facePath} fill="url(#faceFill)" />

      <g clipPath="url(#faceClipUi)">
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`g-${i}`}
            x1="90"
            y1={40 + i * 26}
            x2="220"
            y2={40 + i * 26}
            stroke="#E8F1FF"
            strokeWidth="0.7"
            opacity="0.16"
          />
        ))}

        {edges.map(([a, b], i) => {
          const [x1, y1] = nodes[a];
          const [x2, y2] = nodes[b];
          return (
            <motion.line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#F0F9FF"
              strokeWidth="1.6"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 2.1, repeat: Infinity, delay: (i % 7) * 0.12 }}
            />
          );
        })}

        {nodes.map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r="2.8"
            fill="#fff"
            animate={{ r: [2.2, 4, 2.2], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }}
          />
        ))}

        <motion.rect
          x="95"
          width="125"
          height="26"
          fill="url(#scanGlow)"
          animate={{ y: [35, 240, 35] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </g>

      <motion.g
        stroke="#38BDF8"
        strokeWidth="2.2"
        fill="none"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        <path d="M105 48 h18 M105 48 v18" />
        <path d="M205 48 h-18 M205 48 v18" />
        <path d="M112 248 h18 M112 248 v-18" />
        <path d="M205 248 h-18 M205 248 v-18" />
      </motion.g>
    </motion.svg>
  );
}
