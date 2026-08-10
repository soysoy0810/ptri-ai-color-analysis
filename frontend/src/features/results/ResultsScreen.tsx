import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Mail } from 'lucide-react';

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
      <p className="screen-sub">Send your recommendation by email or scan the QR code to download.</p>

      <div className="grid place-items-center gap-2.5 rounded-2xl border border-line bg-white p-5">
        <QRCodeSVG value={resultUrl} size={180} />
        <span className="text-sm text-muted">Scan QR code for your results</span>
      </div>

      <label className="mt-4 block text-sm font-bold text-navy" htmlFor="result-email">
        Email (optional)
      </label>
      <input
        id="result-email"
        type="email"
        className="mt-2 min-h-touch w-full rounded-2xl border border-line bg-white px-4 text-base text-navy outline-none focus:border-accent"
        placeholder="name@email.com"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        autoComplete="email"
      />

      <button
        type="button"
        className="btn btn-primary mt-4 w-full"
        onClick={handleEmail}
        disabled={sending || !email.trim()}
      >
        <Mail className="h-4 w-4" />
        {sent ? 'Email Sent' : sending ? 'Sending…' : 'Send Result by Email'}
      </button>

      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

      <button type="button" className="btn btn-ghost mt-2 w-full" onClick={onSkip}>
        Skip & Finish
      </button>
    </section>
  );
}
