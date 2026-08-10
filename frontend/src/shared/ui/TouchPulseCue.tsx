import { motion } from 'framer-motion';

interface TouchPulseCueProps {
  className?: string;
}

/** Tap-finger + ripple cue from the home mockup — shows "touch here" */
export function TouchPulseCue({ className = '' }: TouchPulseCueProps) {
  return (
    <div className={`pointer-events-none relative h-16 w-16 ${className}`} aria-hidden="true">
      {/* Ripples centered on the fingertip */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute left-[46%] top-[30%] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-300"
          initial={{ scale: 0.35, opacity: 0.7 }}
          animate={{ scale: 1.85, opacity: 0 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeOut',
            delay: i * 0.45,
          }}
        />
      ))}
      <motion.span
        className="absolute left-[46%] top-[30%] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300/90 shadow-[0_0_12px_rgba(125,211,252,0.95)]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Clean tap hand: index finger extended, other fingers folded */}
      <motion.svg
        viewBox="0 0 64 64"
        className="absolute left-[12px] top-[16px] h-11 w-11 drop-shadow-md"
        animate={{ y: [0, 3.5, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M27.5 8c-2.5 0-4.5 2-4.5 4.5V33l-3.6-3.2c-1.9-1.7-4.8-1.6-6.6.2-1.8 1.8-1.9 4.7-.2 6.6L24 49.8c1.9 2.1 4.6 3.2 7.4 3.2h8.1c5.5 0 10-4.5 10-10v-11c0-2.8-2.2-5-5-5H32V12.5C32 10 30 8 27.5 8z"
          fill="white"
          stroke="#0B1F3A"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </motion.svg>
    </div>
  );
}
