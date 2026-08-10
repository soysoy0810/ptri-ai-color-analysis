import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Mail, SendHorizonal } from 'lucide-react';
import { TrianglePattern } from '../../shared/ui/TrianglePattern';

interface ResultsScreenProps {
  email: string;
  resultToken: string | null;
  onEmailChange: (email: string) => void;
  onSendEmail: () => Promise<void>;
  /** Called after a successful send so the kiosk can advance */
  onSent?: () => void;
}

export function ResultsScreen({
  email,
  resultToken,
  onEmailChange,
  onSendEmail,
  onSent,
}: ResultsScreenProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const resultUrl = useMemo(() => {
    const base = window.location.origin;
    return `${base}/ptri-AI-color-analysis/results/${resultToken || 'demo'}`;
  }, [resultToken]);

  async function handleEmail() {
    setSending(true);
    setError('');
    try {
      await onSendEmail();
      setSent(true);
      window.setTimeout(() => onSent?.(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send email right now.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="screen relative">
      <TrianglePattern className="absolute -right-3 -top-1 z-0 h-24 w-32 rotate-180 opacity-70" />

      <h1 className="screen-title relative z-[1] uppercase tracking-wide">Get Your Results</h1>

      <motion.div
        className="relative z-[1] mt-3 overflow-hidden rounded-[28px] border border-line bg-white p-5 shadow-[0_12px_32px_rgba(11,31,58,0.08)]"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <TrianglePattern className="absolute -right-6 -top-8 h-28 w-36 rotate-180 opacity-45" />

        <div className="relative z-[1] grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
          {/* Email column */}
          <div className="flex min-w-0 flex-col items-center text-center">
            <motion.span
              className="grid h-[4.75rem] w-[4.75rem] place-items-center rounded-full bg-gradient-to-br from-[#0b1f3a] via-[#123a6b] to-[#2f80ed] shadow-[0_12px_28px_rgba(18,58,107,0.35)]"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Mail className="h-9 w-9 text-white" strokeWidth={2} />
            </motion.span>

            <p className="mt-3 text-[14px] font-bold leading-snug text-navy">
              Send your results to your email or scan QR.
            </p>

            <input
              id="result-email"
              type="email"
              className="mt-3 min-h-[48px] w-full rounded-xl border border-line bg-white px-3 text-[13px] text-navy outline-none focus:border-accent"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              autoComplete="email"
            />

            <motion.button
              type="button"
              className="btn mt-2.5 w-full bg-navy px-3 text-[12px] text-white"
              onClick={handleEmail}
              disabled={sending || !email.trim()}
              whileTap={{ scale: 0.97 }}
            >
              {sent ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> SENT
                </>
              ) : (
                <>
                  {sending ? 'SENDING…' : 'SEND RESULTS'} <SendHorizonal className="h-4 w-4" />
                </>
              )}
            </motion.button>
            {error ? <p className="mt-2 text-left text-xs text-red-700">{error}</p> : null}
          </div>

          {/* Vertical OR divider */}
          <div className="flex flex-col items-center justify-center px-1">
            <span className="w-px flex-1 bg-line" />
            <span className="my-2 text-[11px] font-extrabold uppercase tracking-wide text-muted">
              or
            </span>
            <span className="w-px flex-1 bg-line" />
          </div>

          {/* QR column */}
          <div className="flex min-w-0 flex-col items-center justify-center text-center">
            <span className="mb-2 text-[13px] font-extrabold text-navy">Scan QR Code</span>
            <motion.div
              className="rounded-2xl border border-line bg-white p-2.5 shadow-sm"
              animate={{ scale: [1, 1.015, 1] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            >
              <QRCodeSVG value={resultUrl} size={132} level="M" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
