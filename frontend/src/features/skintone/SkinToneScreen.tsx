import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import type { SkinProfile, SkinToneCandidate } from '../../shared/lib/colorEngine';
import { depthLabel, rgbToHex, undertoneLabel } from '../../shared/lib/colorEngine';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface SkinToneScreenProps {
  captureDataUrl: string | null;
  skinProfile: SkinProfile | null;
  /** Real per-region candidates from the AI service (forehead/cheeks/nose/chin) */
  candidates: { swatches: SkinToneCandidate[]; matchIndex: number } | null;
  onContinue: () => void;
  /** Re-runs color analysis using this swatch instead of the auto-detected tone */
  onSelectTone: (rgb: Rgb) => void;
}

export function SkinToneScreen({ captureDataUrl, skinProfile, candidates, onContinue, onSelectTone }: SkinToneScreenProps) {
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const activeIndex = pickedIndex ?? candidates?.matchIndex ?? null;
  const confidence = Math.round(skinProfile?.confidence ?? 0);
  const lowConfidence = confidence > 0 && confidence < 55;

  return (
    <section className="screen">
      <span className="ai-chip mb-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
        Camera-based skin tone analysis
      </span>
      <p className="screen-sub">
        Depth and undertone are measured from several frames of your face. This is a camera
        estimate, not a laboratory reading.
      </p>

      <div className="flex gap-4">
        <motion.div
          className="relative aspect-[4/5] w-[38%] shrink-0 overflow-hidden rounded-2xl bg-slate-200 shadow-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {captureDataUrl ? (
            <img src={captureDataUrl} alt="Your capture" className="h-full w-full object-cover" draggable={false} />
          ) : null}
        </motion.div>

        <div className="flex-1">
          {skinProfile ? (
            <div className="space-y-2.5">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Skin Tone</p>
                <p className="text-2xl font-extrabold text-navy">{depthLabel(skinProfile.depth)}</p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Undertone</p>
                <p className="text-xl font-bold text-navy">{undertoneLabel(skinProfile.undertone)}</p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Confidence</p>
                <p className={`text-xl font-bold ${lowConfidence ? 'text-amber-600' : 'text-navy'}`}>
                  {confidence}%
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {skinProfile?.message ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800">
          {skinProfile.message}
        </p>
      ) : null}

      {(candidates?.swatches ?? []).length ? (
        <div className="mt-4">
          <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wide text-muted">
            Sampled skin regions
          </p>
          <div className="grid grid-cols-5 gap-x-2.5 gap-y-3">
            {(candidates?.swatches ?? []).map((c, i) => (
              <div key={c.label} className="flex flex-col items-center gap-1">
                <motion.button
                  type="button"
                  className={`relative aspect-square w-full rounded-full border-2 shadow-md ring-1 ring-black/10 transition ${
                    i === activeIndex ? 'border-accent scale-[1.08]' : 'border-white'
                  }`}
                  style={{ background: rgbToHex(c.rgb) }}
                  onClick={() => {
                    setPickedIndex(i);
                    onSelectTone(c.rgb);
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: i === activeIndex ? 1.08 : 1 }}
                  transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 260, damping: 18 }}
                  whileTap={{ scale: 0.94 }}
                >
                  {i === activeIndex ? (
                    <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-white shadow">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  ) : null}
                </motion.button>
                <span className="text-[9px] font-semibold text-muted">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <motion.button
        type="button"
        className="btn btn-primary mt-5 w-full"
        onClick={onContinue}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileTap={{ scale: 0.97 }}
      >
        CONTINUE
        <ArrowRight className="h-5 w-5" />
      </motion.button>
    </section>
  );
}
