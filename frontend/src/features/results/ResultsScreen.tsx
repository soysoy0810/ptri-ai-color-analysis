import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Mail, SendHorizonal } from 'lucide-react';

interface ResultsScreenProps {
  email: string;
  resultToken: string | null;
  onEmailChange: (email: string) => void;
  onSendEmail: () => Promise<void>;
  onSent?: () => void;
}

/** Gold + navy textile triangles — top-right decoration from the board */
function ResultsCornerArt() {
  const tris: Array<[string, string]> = [
    ['M20 200 L55 40 L90 200 Z', '#0B1F3A'],
    ['M55 200 L90 30 L125 200 Z', '#C9A227'],
    ['M90 200 L125 50 L160 200 Z', '#1E4D8C'],
    ['M35 200 L70 100 L105 200 Z', '#E8C547'],
    ['M75 200 L110 80 L145 200 Z', '#64748B'],
    ['M115 200 L150 110 L185 200 Z', '#2F80ED'],
  ];
  return (
    <svg className="pointer-events-none absolute -right-1 top-0 h-28 w-36" viewBox="0 0 200 210" aria-hidden>
      {tris.map(([d, fill], i) => (
        <motion.path
          key={i}
          d={d}
          fill={fill}
          fillOpacity={0.85}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: [0.7, 1, 0.7], y: [0, -3, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.12 }}
        />
      ))}
    </svg>
  );
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
      window.setTimeout(() => onSent?.(), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send email right now.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="screen relative overflow-hidden">
      <ResultsCornerArt />

      <motion.h1
        className="screen-title relative z-[1] font-['Libre_Baskerville'] text-[1.65rem] font-bold uppercase tracking-wide text-[#0B1F3A]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Get Your Results
      </motion.h1>

      <motion.div
        className="relative z-[1] mt-4 overflow-hidden rounded-[26px] border border-[#E2E8F0] bg-white shadow-[0_16px_40px_rgba(11,31,58,0.1)]"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.45 }}
      >
        {/* Gold accent stripe — government portal touch */}
        <div className="h-1 bg-gradient-to-r from-[#C9A227] via-[#E8C547] to-[#C9A227]" />

        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-0 p-5">
          {/* Email */}
          <div className="flex flex-col items-center px-2 text-center">
            <motion.div
              className="relative grid h-[5.5rem] w-[5.5rem] place-items-center rounded-full bg-gradient-to-br from-[#0B1F3A] to-[#1E4D8C] shadow-[0_14px_32px_rgba(11,31,58,0.35)]"
              animate={{ scale: [1, 1.05, 1], boxShadow: ['0 14px 32px rgba(11,31,58,0.35)', '0 18px 40px rgba(201,162,39,0.25)', '0 14px 32px rgba(11,31,58,0.35)'] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Mail className="h-10 w-10 text-white" strokeWidth={1.8} />
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-[#C9A227]/50"
                animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity }}
              />
            </motion.div>

            <p className="mt-4 text-[14px] font-bold leading-snug text-[#0B1F3A]">
              Send your results to your email or scan QR.
            </p>

            <input
              id="result-email"
              type="email"
              className="mt-3 min-h-[50px] w-full rounded-xl border border-[#CBD5E1] bg-[#FAFAF8] px-4 text-[14px] text-[#0B1F3A] outline-none transition-colors focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              autoComplete="email"
            />

            <motion.button
              type="button"
              className="btn mt-3 w-full bg-[#0B1F3A] text-[13px] font-extrabold uppercase tracking-wide text-white"
              onClick={handleEmail}
              disabled={sending || !email.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {sent ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[#E8C547]" /> Sent!
                </>
              ) : (
                <>
                  {sending ? 'Sending…' : 'Send Results'} <SendHorizonal className="h-4 w-4" />
                </>
              )}
            </motion.button>
            {error ? <p className="mt-2 w-full text-left text-xs font-semibold text-red-700">{error}</p> : null}
          </div>

          {/* OR divider */}
          <div className="flex flex-col items-center justify-center px-3">
            <span className="w-px flex-1 bg-[#CBD5E1]" />
            <span className="my-3 text-[12px] font-extrabold uppercase tracking-widest text-[#94A3B8]">or</span>
            <span className="w-px flex-1 bg-[#CBD5E1]" />
          </div>

          {/* QR */}
          <div className="flex flex-col items-center justify-center px-2 text-center">
            <motion.p
              className="mb-3 text-[14px] font-extrabold text-[#0B1F3A]"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Scan QR Code
            </motion.p>
            <motion.div
              className="rounded-2xl border-2 border-[#E2E8F0] bg-white p-3 shadow-inner"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <QRCodeSVG value={resultUrl} size={140} level="M" />
            </motion.div>
            <p className="mt-2 text-[11px] font-medium text-[#64748B]">Scan with your phone</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
