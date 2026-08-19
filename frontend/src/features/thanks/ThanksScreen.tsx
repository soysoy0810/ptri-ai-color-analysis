import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Home } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ThanksScreenProps {
  name: string;
  email?: string;
  resultToken?: string | null;
  onReset: () => void;
}

const RESET_SEC = 20;

export function ThanksScreen({ name, email, resultToken, onReset }: ThanksScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(RESET_SEC);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(tick);
          onReset();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [onReset]);

  const resultUrl = useMemo(() => {
    const base = window.location.origin;
    return `${base}/ptri-AI-color-analysis/results/${resultToken || 'demo'}`;
  }, [resultToken]);

  return (
    <section className="screen items-center text-center">
      <p className="screen-sub">Your result has been sent successfully.</p>

      <motion.div
        className="mx-auto mb-6 grid h-28 w-28 place-items-center rounded-full bg-[#C9A227] text-white shadow-lg"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
      >
        <Check className="h-14 w-14" strokeWidth={3} />
      </motion.div>

      <div className="mb-4 w-full rounded-2xl border border-line bg-white p-4">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted">Scan QR Code</p>
        <div className="mx-auto w-fit rounded-xl border-2 border-navy bg-white p-2">
          <QRCodeSVG value={resultUrl} size={132} level="M" />
        </div>
        <p className="mt-2 text-[11px] font-semibold text-muted">Scan to open your result on a phone.</p>
      </div>

      <div className="mb-6 w-full rounded-2xl border border-line bg-white p-4 text-left">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted">Send To Email</p>
        <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
          <span className="truncate text-sm font-bold text-navy">{email || name || 'Guest'}</span>
          <span className="grid h-6 w-6 place-items-center rounded-full bg-navy text-white">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        </div>
      </div>

      <p className="mb-4 text-[11px] font-semibold leading-snug text-muted">
        Philippine Textile Research Institute
        <br />
        Innovating Textiles, Empowering Filipinos.
      </p>

      <button type="button" className="btn btn-primary w-full" onClick={onReset}>
        <Home className="h-4 w-4" />
        HOME
      </button>
      <p className="mt-2 text-[10px] font-semibold text-muted">Returning to welcome in {secondsLeft}s</p>
    </section>
  );
}
