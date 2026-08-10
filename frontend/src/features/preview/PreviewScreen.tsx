import { BACKGROUNDS, CATEGORIES, DESIGNS, FABRICS } from '../../data/catalog';
import type { PaletteColor } from '../../shared/lib/types';

interface PreviewScreenProps {
  captureDataUrl: string | null;
  categoryId: string | null;
  designId: string | null;
  backgroundId: string;
  fabricId: string | null;
  selectedColors: PaletteColor[];
  onChangeBackground: () => void;
  onViewDetails: () => void;
}

export function PreviewScreen({
  captureDataUrl,
  categoryId,
  designId,
  backgroundId,
  fabricId,
  selectedColors,
  onChangeBackground,
  onViewDetails,
}: PreviewScreenProps) {
  const bg = BACKGROUNDS.find((b) => b.id === backgroundId) || BACKGROUNDS[0];
  const fabric = FABRICS.find((f) => f.id === fabricId);
  const garmentColor = fabric?.hex || selectedColors[0]?.hex || '#1E4D8C';
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const design = (categoryId && DESIGNS[categoryId]?.find((d) => d.id === designId)) || undefined;

  return (
    <section className="screen">
      <h1 className="screen-title">Preview Your Look</h1>
      <p className="screen-sub">Your selections with a live preview of fabric color and face.</p>

      <div className="grid grid-cols-[1fr_1.15fr] gap-3">
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-line bg-white p-3.5">
            <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted">
              Your Selections
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted">Category</span>
                <strong className="text-right text-navy">{category?.label || '—'}</strong>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted">Design</span>
                <strong className="text-right text-navy">{design?.name || '—'}</strong>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted">Fabric</span>
                <strong className="text-right text-navy">{fabric?.name || '—'}</strong>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedColors.slice(0, 5).map((c) => (
                <span
                  key={c.id}
                  className="h-6 w-6 rounded-full border border-black/10"
                  style={{ background: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <button type="button" className="btn btn-secondary w-full text-xs" onClick={onChangeBackground}>
            CHANGE BACKGROUND
          </button>
          <button type="button" className="btn btn-ghost w-full border border-line text-xs" onClick={onViewDetails}>
            VIEW DETAILS
          </button>
        </div>

        <div className="relative min-h-[340px] overflow-hidden rounded-3xl shadow-kiosk">
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(180deg, ${bg.tone}, #ffffff)` }}
          />
          <div
            className="absolute bottom-[8%] left-1/2 h-[48%] w-[58%] -translate-x-1/2 rounded-[18px_18px_40%_40%] shadow-lg"
            style={{ background: garmentColor }}
          />
          {captureDataUrl ? (
            <img
              src={captureDataUrl}
              alt="Captured face preview"
              className="absolute left-1/2 top-[14%] aspect-square w-[42%] -translate-x-1/2 rounded-full border-4 border-white/85 object-cover shadow-lg"
            />
          ) : (
            <div className="absolute left-1/2 top-[14%] aspect-square w-[42%] -translate-x-1/2 rounded-full border-4 border-white/85 bg-slate-300" />
          )}
        </div>
      </div>
    </section>
  );
}
