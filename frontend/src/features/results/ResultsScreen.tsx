import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Mail, SendHorizonal } from 'lucide-react';
import { resolveGarmentKey, resolveTryonUrl } from '../../shared/lib/catalogStore';
import type { FaceRegion, PaletteColor } from '../../shared/lib/types';
import { LookComposer } from '../../shared/ui/LookComposer';

interface ResultsScreenProps {
  email: string;
  resultToken: string | null;
  captureDataUrl: string | null;
  faceBox: FaceRegion | null;
  gender: string;
  designId: string | null;
  backgroundId: string;
  fabricId: string | null;
  selectedColors: PaletteColor[];
  fabricHex: string;
  designName?: string;
  onEmailChange: (email: string) => void;
  onSendEmail: () => Promise<void>;
  onSent?: () => void;
}

export function ResultsScreen({
  email,
  resultToken,
  captureDataUrl,
  faceBox,
  gender,
  designId,
  backgroundId,
  fabricHex,
  designName,
  onEmailChange,
  onSendEmail,
  onSent,
}: ResultsScreenProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const garmentKey = resolveGarmentKey(designId);
  const tryonImageUrl = resolveTryonUrl(designId);

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
    <section className="-mx-5 -mt-4 flex min-h-0 flex-col">
      {/* Full try-on — 4:5 portrait matches composed result image */}
      <div className="relative mx-auto w-full shrink-0 overflow-hidden bg-slate-200 aspect-[4/5] max-h-[62vh]">
        <LookComposer
          fullBleed
          fitContain
          captureDataUrl={captureDataUrl}
          faceBox={faceBox}
          gender={gender}
          garmentKey={garmentKey}
          fabricHex={fabricHex}
          backgroundId={backgroundId}
          designName={designName}
          tryonImageUrl={tryonImageUrl}
        />
      </div>

      <div className="shrink-0 px-3 pb-6 pt-3">
        <motion.h1
          className="mb-3 text-center font-['Libre_Baskerville'] text-[1.05rem] font-bold uppercase tracking-wide text-[#0B1F3A]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Get Your Results
        </motion.h1>

        <motion.div
          className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="h-1 bg-gradient-to-r from-[#C9A227] via-[#E8C547] to-[#C9A227]" />

          <div className="flex flex-col gap-0 p-4">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0B1F3A] to-[#1E4D8C] shadow-md">
                <Mail className="h-5 w-5 text-white" strokeWidth={1.8} />
              </div>
              <p className="mt-2 text-[11px] font-bold leading-snug text-[#0B1F3A]">Send to email</p>
              <input
                type="email"
                className="mt-2 min-h-[44px] w-full rounded-xl border border-[#CBD5E1] bg-[#FAFAF8] px-3 text-[13px] outline-none focus:border-[#C9A227]"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                autoComplete="email"
              />
              <motion.button
                type="button"
                className="btn mt-2 w-full bg-[#0B1F3A] py-2.5 text-[12px] font-extrabold uppercase text-white"
                onClick={handleEmail}
                disabled={sending || !email.trim()}
                whileTap={{ scale: 0.97 }}
              >
                {sent ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#E8C547]" /> Sent!
                  </>
                ) : (
                  <>
                    {sending ? 'Sending…' : 'Send Results'}{' '}
                    <SendHorizonal className="h-3.5 w-3.5" />
                  </>
                )}
              </motion.button>
              {error ? (
                <p className="mt-1.5 w-full text-left text-[10px] font-semibold text-red-700">{error}</p>
              ) : null}
            </div>

            <div className="my-4 h-px w-full bg-[#E2E8F0]" />

            <div className="flex flex-col items-center text-center">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#64748B]">or scan</p>
              <p className="mt-1 mb-2 text-[12px] font-extrabold text-[#0B1F3A]">Scan QR Code</p>
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-2">
                <QRCodeSVG value={resultUrl} size={120} level="M" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
