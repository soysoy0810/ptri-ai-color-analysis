import { motion } from 'framer-motion';

interface TrianglePatternProps {
  className?: string;
}

/** Animated textile triangle tessellation */
export function TrianglePattern({ className = '' }: TrianglePatternProps) {
  const triangles: Array<[string, string]> = [
    ['M20 220 L70 80 L120 220 Z', '#071526'],
    ['M70 220 L120 60 L170 220 Z', '#0B1F3A'],
    ['M120 220 L170 90 L220 220 Z', '#12325A'],
    ['M40 220 L85 130 L130 220 Z', '#2F80ED'],
    ['M95 220 L145 110 L195 220 Z', '#1B4F9C'],
    ['M145 220 L190 140 L235 220 Z', '#5B9FEF'],
    ['M0 220 L45 150 L90 220 Z', '#93C5FD'],
    ['M55 220 L100 155 L145 220 Z', '#0A2540'],
    ['M110 220 L155 160 L200 220 Z', '#2F80ED'],
    ['M160 220 L205 150 L250 220 Z', '#0B1F3A'],
    ['M30 220 L60 175 L90 220 Z', '#E2C57A'],
    ['M80 220 L115 170 L150 220 Z', '#5B9FEF'],
    ['M130 220 L165 175 L200 220 Z', '#12325A'],
    ['M180 220 L215 165 L250 220 Z', '#D4A84B'],
  ];

  return (
    <svg
      className={`pointer-events-none ${className}`}
      viewBox="0 0 260 230"
      fill="none"
      aria-hidden="true"
    >
      {triangles.map(([d, fill], i) => (
        <motion.path
          key={i}
          d={d}
          fill={fill}
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.08 }}
        />
      ))}
    </svg>
  );
}
