import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, QrCode, Send } from 'lucide-react';

interface ResultsScreenProps {
  email: string;
  resultToken: string | null;
  onEmailChange: (email: string) => void;
  onSendEmail: () => Promise<void>;
  onSkip: () => void;
}

export function ResultsScreen({
  email,
  resultToken,
  onEmailChange,
  onSendEmail,
  onSkip,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send email right now.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="screen">
      <h1 className="screen-title">Get Your Result</h1>
      <p className="screen-sub">Send your result to your email or scan the QR code.</p>

      {/* Send via Email */}
      <motion.div
        className="rounded-2xl border border-line bg-white p-4 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted">
          Send via Email
        </div>
        <div className="flex gap-2">
          <input
            id="result-email"
            type="email"
            className="min-h-touch w-full flex-1 rounded-2xl border border-line bg-white px-4 text-base text-navy outline-none focus:border-accent"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            autoComplete="email"
          />
          <motion.button
            type="button"
            className="btn btn-accent min-w-[56px] px-0"
            onClick={handleEmail}
            disabled={sending || !email.trim()}
            whileTap={{ scale: 0.92 }}
            aria-label="Send result to email"
          >
            {sent ? <CheckCircle2 className="h-5 w-5" /> : <Send className="h-5 w-5" />}
          </motion.button>
        </div>
        {sent ? (
          <p className="mt-2 text-sm font-semibold text-emerald-600">Email sent — check your inbox!</p>
        ) : null}
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </motion.div>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          or Scan QR Code
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      {/* QR panel */}
      <motion.div
        className="grid place-items-center gap-2.5 rounded-2xl border border-line bg-white p-5 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <motion.div
          className="rounded-2xl border-4 border-accent-soft p-3"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          <QRCodeSVG value={resultUrl} size={168} />
        </motion.div>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-muted">
          <QrCode className="h-4 w-4" />
          Scan with your phone to download your result
        </span>
      </motion.div>

      <button type="button" className="btn btn-ghost mt-3 w-full" onClick={onSkip}>
        Skip &amp; Finish
      </button>
    </section>
  );
}
