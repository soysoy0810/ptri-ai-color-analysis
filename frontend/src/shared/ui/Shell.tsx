import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AiAtmosphere } from './AiAtmosphere';
import { WaveAccent } from './WaveAccent';

function PatternBorder({ className = '' }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id="ptri-weave" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill="none" />
          <path d="M9 1 L17 9 L9 17 L1 9 Z" fill="none" stroke="#C9A227" strokeWidth="1" opacity="0.55" />
          <circle cx="9" cy="9" r="1.4" fill="#0B1F3A" opacity="0.35" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ptri-weave)" />
    </svg>
  );
}

/** Wavy fabric threads along the bottom, like folded tela */
function FabricWaves({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 90" preserveAspectRatio="none" aria-hidden>
      <path d="M0 70 C70 40, 140 88, 210 58 S350 20, 420 48 L420 90 L0 90 Z" fill="#0B1F3A" opacity="0.08" />
      <path d="M0 78 C80 52, 160 92, 240 68 S340 40, 420 62 L420 90 L0 90 Z" fill="#1E4D8C" opacity="0.1" />
      <path
        d="M0 54 C60 28, 130 72, 200 44 S330 18, 420 38"
        fill="none"
        stroke="#C9A227"
        strokeWidth="1.6"
        opacity="0.55"
      />
      <path
        d="M0 62 C90 38, 170 80, 250 52 S360 30, 420 50"
        fill="none"
        stroke="#2F80ED"
        strokeWidth="1.3"
        opacity="0.4"
      />
    </svg>
  );
}

interface ShellProps {
  children: ReactNode;
  stepIndex: number;
  totalSteps: number;
  stepLabel?: string;
  showHeader?: boolean;
  footer?: ReactNode;
  toast?: string;
}

function Stepper({ stepIndex, totalSteps, label }: { stepIndex: number; totalSteps: number; label?: string }) {
  const dots = Math.max(1, totalSteps - 2);
  const current = Math.min(Math.max(stepIndex - 1, 0), dots - 1);
  const displayNum = Math.max(1, stepIndex);
  return (
    <div className="relative z-[1] px-5 pt-4">
      <div className="flex items-center gap-3">
        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-[15px] font-extrabold text-white shadow-ai">
          <span className="absolute inset-[-4px] rounded-full border border-sky-300/60" />
          {displayNum}
        </span>
        <h2 className="text-[15px] font-extrabold uppercase tracking-wide text-navy">{label}</h2>
      </div>
      <div className="relative mt-3 flex items-center">
        <div className="absolute inset-x-0 h-[2px] rounded bg-line" />
        <motion.div
          className="absolute left-0 h-[2px] rounded bg-accent"
          animate={{ width: `${dots > 1 ? (current / (dots - 1)) * 100 : 0}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <div className="relative flex w-full justify-between">
          {Array.from({ length: dots }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full border-2 ${
                i < current
                  ? 'border-accent bg-accent'
                  : i === current
                    ? 'border-accent bg-white'
                    : 'border-line bg-white'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Shell({
  children,
  stepIndex,
  totalSteps,
  stepLabel,
  showHeader = true,
  footer,
  toast,
}: ShellProps) {
  return (
    <div className="kiosk-shell">
      {showHeader ? (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#F4F8FC]" aria-hidden="true">
          <AiAtmosphere />
          <WaveAccent className="absolute inset-x-0 bottom-[6%] h-[32%] w-full opacity-[0.14]" />
          <FabricWaves className="absolute inset-x-0 bottom-0 h-24 w-full" />
          <PatternBorder className="absolute inset-x-0 bottom-0 h-3 w-full" />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1 bg-gradient-to-r from-[#C9A227] via-accent to-[#C9A227]" />

      {toast ? (
        <div className="absolute left-1/2 top-16 z-20 -translate-x-1/2 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-kiosk">
          {toast}
        </div>
      ) : null}

      {showHeader && stepIndex > 0 ? (
        <Stepper stepIndex={stepIndex} totalSteps={totalSteps} label={stepLabel} />
      ) : null}

      <main
        className={`relative z-[1] flex min-h-0 flex-1 flex-col ${
          showHeader ? 'overflow-y-auto overflow-x-hidden px-5 pb-5 pt-4' : 'overflow-hidden p-0'
        }`}
      >
        {children}
      </main>

      {footer ? (
        <footer className="relative z-[1] flex items-center gap-2.5 border-t border-sky-100 bg-white/70 px-5 pb-[calc(16px+var(--safe-bottom))] pt-3 backdrop-blur-md">
          {footer}
        </footer>
      ) : null}

    </div>
  );
}
