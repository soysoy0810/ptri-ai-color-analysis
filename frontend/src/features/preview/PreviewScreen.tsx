import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { BACKGROUNDS } from '../../data/catalog';
import { getDesignById, resolvePreviewUrl, resolveVtonGarmentUrl, vtonCategoryForDesign, vtonDescriptionForDesign } from '../../shared/lib/catalogStore';
import { BACKGROUND_SRC } from '../../data/garments';
import { VirtualTryOn } from '../../shared/ui/VirtualTryOn';
import { textileSrc, type TextileId } from '../../data/textiles';
import type { PortraitLighting } from '../../shared/lib/types';

const LIGHTING_OPTIONS: Array<{ id: PortraitLighting; label: string; swatch: string }> = [
  { id: 'warm', label: 'Warm', swatch: '#E8C48A' },
  { id: 'neutral', label: 'Neutral', swatch: '#E2E8F0' },
  { id: 'cool', label: 'Cool', swatch: '#93C5FD' },
];

interface PreviewScreenProps {
  captureDataUrl: string | null;
  designId: string | null;
  fabricHex: string;
  fabricName?: string;
  textileId?: TextileId | null;
  backgroundId: string;
  onBackgroundSelect: (backgroundId: string) => void;
  lighting: PortraitLighting;
  onLightingChange: (lighting: PortraitLighting) => void;
  onTryOnGenerated?: (imageDataUrl: string) => void;
  onTryOnFailed?: () => void;
}

/**
 * Preview of the generative try-on. Clothing is transferred by the AI
 * service onto the session scan captured at the start — this screen
 * never opens the camera or asks for another scan.
 */
export function PreviewScreen({
  captureDataUrl,
  designId,
  fabricHex,
  fabricName,
  textileId = null,
  backgroundId,
  onBackgroundSelect,
  lighting,
  onLightingChange,
  onTryOnGenerated,
  onTryOnFailed,
}: PreviewScreenProps) {
  const design = getDesignById(designId);
  const designPhoto = resolvePreviewUrl(designId);
  const vtonGarmentUrl = resolveVtonGarmentUrl(designId);
  const vtonCategory = vtonCategoryForDesign(designId);
  const vtonName = vtonDescriptionForDesign(designId, design?.name || 'outfit');

  return (
    <section className="-mx-5 -mt-4 flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 px-5 pb-2 pt-1">
        <p className="mb-0 text-[0.95rem] font-semibold leading-relaxed text-navy">
          See how your selected clothing, textile and colors look on you.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 px-5 pb-3">
        <motion.div
          className="relative min-h-0 flex-1 overflow-hidden rounded-2xl shadow-kiosk"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <VirtualTryOn
            className="h-full w-full"
            captureDataUrl={captureDataUrl}
            garmentUrl={vtonGarmentUrl}
            garmentName={vtonName}
            category={vtonCategory}
            fabricHex={fabricHex}
            textileName={fabricName}
            textileUrl={textileSrc(textileId)}
            accessoryItems={[]}
            backgroundId={backgroundId}
            lighting={lighting}
            onGenerated={onTryOnGenerated}
            onFailed={onTryOnFailed}
          />
        </motion.div>

        <div className="flex w-[124px] shrink-0 flex-col gap-3 overflow-y-auto">
          {design ? (
            <div className="rounded-xl border border-line bg-white p-2.5">
              <p className="mb-2 text-[9px] font-extrabold uppercase tracking-wide text-muted">Your Outfit</p>
              {designPhoto ? (
                <img
                  src={designPhoto}
                  alt={design.name}
                  className="mb-1.5 h-20 w-full rounded-lg object-contain"
                  draggable={false}
                />
              ) : null}
              <p className="text-[9px] font-bold leading-tight text-navy">{design.name}</p>
              {fabricName ? (
                <p className="mt-1 text-[8px] font-semibold text-muted">{fabricName}</p>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-xl border border-line bg-white p-2.5">
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-wide text-muted">Background</p>
            <div className="grid grid-cols-2 gap-1.5">
              {BACKGROUNDS.map((bg) => {
                const active = backgroundId === bg.id;
                const thumb = BACKGROUND_SRC[bg.id];
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => onBackgroundSelect(bg.id)}
                    className={`relative overflow-hidden rounded-md border-2 transition ${
                      active ? 'border-accent' : 'border-transparent opacity-80'
                    }`}
                  >
                    <img src={thumb} alt={bg.label} className="h-9 w-full object-cover" draggable={false} />
                    {active ? (
                      <span className="absolute right-0.5 top-0.5 grid h-3 w-3 place-items-center rounded-full bg-accent text-white">
                        <Check className="h-2 w-2" strokeWidth={4} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-2.5">
            <p className="mb-1 text-[9px] font-extrabold uppercase tracking-wide text-muted">Accessories</p>
            <p className="text-[9px] font-semibold leading-snug text-muted">AI generation coming soon.</p>
          </div>

          <div className="rounded-xl border border-line bg-white p-2.5">
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-wide text-muted">Lighting</p>
            <div className="flex flex-col gap-1.5">
              {LIGHTING_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onLightingChange(opt.id)}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-bold transition ${
                    lighting === opt.id ? 'bg-accent text-white' : 'bg-slate-50 text-navy'
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                    style={{ background: opt.swatch }}
                  />
                  {opt.label}
                  {lighting === opt.id ? <Check className="ml-auto h-3 w-3" strokeWidth={3} /> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
