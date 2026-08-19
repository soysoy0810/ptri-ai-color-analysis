import { useMemo, useState } from 'react';
import { Download, SendHorizonal } from 'lucide-react';
import { ACCESSORY_ITEMS, CATEGORIES } from '../../data/catalog';
import { getDesignById } from '../../shared/lib/catalogStore';
import type { PaletteColor, SessionSummary } from '../../shared/lib/types';

interface ResultsScreenProps {
  email: string;
  resultToken: string | null;
  tryOnImage: string | null;
  selectedColors: PaletteColor[];
  selectedAccessories: string[];
  summary?: SessionSummary | null;
  onEmailChange: (email: string) => void;
  onSendEmail: () => Promise<void>;
  onSent?: () => void;
  onChangeStyle?: () => void;
}

export function ResultsScreen({
  email,
  resultToken,
  tryOnImage,
  selectedColors,
  selectedAccessories,
  summary,
  onEmailChange,
  onSendEmail,
  onSent,
  onChangeStyle,
}: ResultsScreenProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const top5 = selectedColors.slice(0, 5);
  const design = summary?.designId ? getDesignById(summary.designId) : null;
  const category = summary?.categoryId ? CATEGORIES.find((c) => c.id === summary.categoryId) : null;
  const chosenAccessories = useMemo(
    () => ACCESSORY_ITEMS.filter((a) => selectedAccessories.includes(a.id)),
    [selectedAccessories],
  );
  const accessoryLabel = chosenAccessories.map((a) => a.name).join(', ') || 'None selected';

  function saveResult() {
    if (!tryOnImage) return;
    const a = document.createElement('a');
    a.href = tryOnImage;
    a.download = `ptri-result-${resultToken || 'look'}.jpg`;
    a.click();
  }

  async function handleEmail() {
    setSending(true);
    setError('');
    try {
      await onSendEmail();
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send email right now.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="screen pb-4">
      <span className="ai-chip mb-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        Recommendation ready
      </span>
      <p className="mb-3 text-[0.98rem] font-semibold leading-relaxed text-navy">
        Your personalized AI Color &amp; Textile Recommendation.
      </p>

      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted">Your Look</p>
      <div className="mb-4 shrink-0 rounded-2xl border border-sky-100 bg-slate-900 shadow-sm">
        {tryOnImage ? (
          <img
            src={tryOnImage}
            alt="AI-generated try-on"
            className="mx-auto block h-auto max-h-[min(58vh,560px)] w-full object-contain object-center"
            draggable={false}
          />
        ) : (
          <div className="grid min-h-[220px] place-items-center px-4 text-center text-[11px] font-semibold text-white/80">
            Virtual try-on unavailable — no generated image. This screen will not show a clothing overlay.
          </div>
        )}
        <p className="bg-white py-2 text-center text-[11px] font-extrabold uppercase text-navy">
          {tryOnImage ? 'Generated try-on' : 'Virtual try-on could not be generated'}
        </p>
      </div>

      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted">Your Top 5 Colors</p>
      <div className="mb-4 flex gap-2">
        {top5.map((c) => (
          <span
            key={c.id}
            className="h-11 w-11 rounded-full border-2 border-white shadow-md ring-1 ring-black/10"
            style={{ background: c.hex }}
          />
        ))}
      </div>

      <div className="mb-4 rounded-2xl border border-line bg-slate-50 p-4 text-sm">
        <div className="mb-2 flex items-start justify-between gap-3">
          <span className="shrink-0 text-muted">Best Style</span>
          <strong className="text-right text-navy">{category?.label || design?.name || '—'}</strong>
        </div>
        <div className="mb-2 flex items-start justify-between gap-3">
          <span className="shrink-0 text-muted">Best Colors</span>
          <strong className="text-right text-navy">{top5.slice(0, 3).map((c) => c.name).join(', ') || '—'}</strong>
        </div>
        <div className="mb-2 flex items-start justify-between gap-3">
          <span className="shrink-0 text-muted">Best Fabrics</span>
          <strong className="text-right text-navy">{summary?.fabric?.name || '—'}</strong>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-muted">Best Accessories</span>
          <strong className="break-words text-right text-navy">{accessoryLabel}</strong>
        </div>
      </div>

      {onChangeStyle ? (
        <button type="button" onClick={onChangeStyle} className="mb-3 text-center text-[11px] font-extrabold uppercase text-accent">
          Change Style
        </button>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn border-2 border-navy bg-white text-navy" onClick={saveResult} disabled={!tryOnImage}>
          <Download className="h-4 w-4" />
          SAVE RESULT
        </button>
        <button type="button" className="btn btn-primary" onClick={handleEmail} disabled={sending || !email.trim()}>
          {sending ? 'Sending…' : 'SEND RESULT'}
          <SendHorizonal className="h-4 w-4" />
        </button>
      </div>
      <input
        type="email"
        className="mt-2 min-h-[44px] w-full rounded-xl border border-line px-3 text-sm text-navy outline-none focus:border-navy"
        placeholder="Email for SEND RESULT"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
      />
      {error ? <p className="mt-2 text-[11px] font-semibold text-red-600">{error}</p> : null}
    </section>
  );
}
