import type { ReactNode } from 'react';
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

      {showHeader ? (
        <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-navy to-accent text-[11px] font-extrabold tracking-wide text-white">
              PTRI
            </div>
            <div>
              <strong className="block text-[13px] leading-tight text-navy">AI Color Analysis</strong>
              <span className="text-[11px] text-muted">DOST–Philippine Textile Research Institute</span>
            </div>
          </div>
          {stepIndex > 0 ? (
            <div className="max-w-[46%] rounded-full bg-accent-soft px-3 py-2 text-right text-[10px] font-bold leading-tight text-accent">
              <div>
                {stepIndex} / {totalSteps - 1}
              </div>
              <div className="truncate">{stepLabel}</div>
            </div>
          ) : null}
        </header>
      ) : null}

      <main className="flex-1 overflow-auto px-5 pb-5 pt-2">{children}</main>

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
