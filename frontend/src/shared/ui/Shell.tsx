import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

interface ShellProps {
  children: ReactNode;
  stepIndex: number;
  totalSteps: number;
  stepLabel?: string;
  showHeader?: boolean;
  footer?: ReactNode;
  onHelp?: (() => void) | null;
  toast?: string;
}

/** Numbered step header + dot progress track, matching the approved design board */
function Stepper({ stepIndex, totalSteps, label }: { stepIndex: number; totalSteps: number; label?: string }) {
  // dots exclude welcome/thanks bookends
  const dots = totalSteps - 2;
  const current = Math.min(Math.max(stepIndex - 1, 0), dots - 1);
  return (
    <div className="px-5 pt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-extrabold tabular-nums text-accent">
            {String(stepIndex + 1).padStart(2, '0')}
          </span>
          <span className="text-[13px] font-extrabold uppercase tracking-wide text-navy">
            {label}
          </span>
        </div>
      </div>
      <div className="relative mt-2 flex items-center">
        <div className="absolute inset-x-0 h-[2px] rounded bg-line" />
        <motion.div
          className="absolute left-0 h-[2px] rounded bg-accent"
          animate={{ width: `${(current / (dots - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <div className="relative flex w-full justify-between">
          {Array.from({ length: dots }, (_, i) => (
            <motion.span
              key={i}
              className={`h-2.5 w-2.5 rounded-full border-2 ${
                i < current
                  ? 'border-accent bg-accent'
                  : i === current
                    ? 'border-accent bg-white'
                    : 'border-line bg-white'
              }`}
              animate={i === current ? { scale: [1, 1.35, 1] } : { scale: 1 }}
              transition={i === current ? { duration: 1.6, repeat: Infinity } : {}}
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
  onHelp,
  toast,
}: ShellProps) {
  return (
    <div className="kiosk-shell">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1.5 bg-gradient-to-r from-accent via-sky-300 to-navy" />

      {toast ? (
        <div className="absolute left-1/2 top-16 z-20 -translate-x-1/2 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-kiosk">
          {toast}
        </div>
      ) : null}

      {showHeader && stepIndex > 0 ? (
        <Stepper stepIndex={stepIndex} totalSteps={totalSteps} label={stepLabel} />
      ) : null}

      <main
        className={`flex min-h-0 flex-1 flex-col ${
          showHeader ? 'overflow-y-auto overflow-x-hidden px-5 pb-5 pt-4' : 'overflow-hidden p-0'
        }`}
      >
        {children}
      </main>

      {footer ? (
        <footer className="flex items-center gap-2.5 border-t border-line/80 bg-white/90 px-5 pb-[calc(16px+var(--safe-bottom))] pt-3">
          {footer}
        </footer>
      ) : null}

      {onHelp ? (
        <button
          type="button"
          className="absolute bottom-24 right-4 z-[6] inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-sm font-bold text-navy shadow-kiosk"
          onClick={onHelp}
        >
          <HelpCircle className="h-4 w-4" />
          Call Staff
        </button>
      ) : null}
    </div>
  );
}
