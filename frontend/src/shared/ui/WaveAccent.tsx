import { motion } from 'framer-motion';

interface WaveAccentProps {
  className?: string;
}

/** Animated thread / topographic waves with blue + gold accents */
export function WaveAccent({ className = '' }: WaveAccentProps) {
  const waves = [
    { color: '#C5D4E6', width: 1.4, delay: 0 },
    { color: '#93C5FD', width: 1.5, delay: 0.2 },
    { color: '#D4A84B', width: 1.3, delay: 0.35 },
    { color: '#B8C7D9', width: 1.4, delay: 0.5 },
    { color: '#2F80ED', width: 1.2, delay: 0.65 },
    { color: '#E2C57A', width: 1.1, delay: 0.8 },
  ];

  return (
    <svg
      className={`pointer-events-none ${className}`}
      viewBox="0 0 420 320"
      fill="none"
      aria-hidden="true"
    >
      {waves.map((wave, i) => {
        const y = 36 + i * 16;
        return (
          <motion.path
            key={i}
            d={`M10 ${y}
               C80 ${y - 28}, 150 ${y + 34}, 220 ${y - 8}
               S340 ${y - 36}, 410 ${y + 6}`}
            stroke={wave.color}
            strokeWidth={wave.width}
            opacity={0.55}
            animate={{
              d: [
                `M10 ${y} C80 ${y - 28}, 150 ${y + 34}, 220 ${y - 8} S340 ${y - 36}, 410 ${y + 6}`,
                `M10 ${y + 8} C80 ${y + 18}, 150 ${y - 22}, 220 ${y + 14} S340 ${y + 28}, 410 ${y - 4}`,
                `M10 ${y} C80 ${y - 28}, 150 ${y + 34}, 220 ${y - 8} S340 ${y - 36}, 410 ${y + 6}`,
              ],
            }}
            transition={{
              duration: 5.5 + i * 0.35,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: wave.delay,
            }}
          />
        );
      })}
    </svg>
  );
}
