import { motion } from 'framer-motion';

interface TouchPulseCueProps {
  className?: string;
}

/** Hand + ripple cue from the home mockup — shows “touch here” */
export function TouchPulseCue({ className = '' }: TouchPulseCueProps) {
  return (
    <div className={`pointer-events-none relative h-16 w-16 ${className}`} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-[38%] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-300"
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
        className="absolute left-1/2 top-[38%] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.95)]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.svg
        viewBox="0 0 64 64"
        className="absolute left-[10px] top-[14px] h-12 w-12 drop-shadow-md"
        animate={{ y: [0, 3, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M28 10c1.4 0 2.5 1.1 2.5 2.5V28l1.2-.8c1.1-.7 2.6-.5 3.4.5l.4.5
             c.7 1 .5 2.4-.5 3.1l-8.2 6.1c-.7.5-1.5.8-2.4.8H18.5C15.5 38 13 35.5 13 32.5V22
             c0-1.4 1.1-2.5 2.5-2.5S18 20.6 18 22v8.5h1.5V14.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5V28
             H26V12.5c0-1.4 1.1-2.5 2-2.5z"
          fill="white"
          stroke="#0B1F3A"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M34 20.5c1.4 0 2.5 1.1 2.5 2.5V30h1.5c1.4 0 2.5 1.1 2.5 2.5
             0 4.1-3.4 7.5-7.5 7.5h-5"
          fill="none"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </motion.svg>
    </div>
  );
}
