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

      <div className="mt-1 grid grid-cols-1 gap-3">
        {/* Visual preview (dominant, like board right panel) */}
        <div className="relative min-h-[300px] overflow-hidden rounded-3xl shadow-kiosk">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(165deg, ${bg.tone} 0%, #dbe4ee 45%, #f8fafc 100%)`,
            }}
          />
          {/* Garment body */}
          <div
            className="absolute bottom-[6%] left-1/2 h-[52%] w-[62%] -translate-x-1/2 rounded-[22px_22px_46%_46%] shadow-xl"
            style={{ background: garmentColor }}
          >
            <div className="absolute left-1/2 top-3 -translate-x-1/2 text-[10px] font-extrabold tracking-[0.2em] text-white/80">
              PTRI
            </div>
          </div>
          {captureDataUrl ? (
            <img
              src={captureDataUrl}
              alt="Your face preview"
              className="absolute left-1/2 top-[10%] aspect-square w-[44%] -translate-x-1/2 rounded-full border-4 border-white object-cover shadow-lg"
            />
          ) : (
            <div className="absolute left-1/2 top-[10%] aspect-square w-[44%] -translate-x-1/2 rounded-full border-4 border-white bg-slate-300 shadow-lg" />
          )}
        </div>

        {/* Selections summary */}
        <div className="rounded-2xl border border-line bg-white p-4">
          <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-muted">
            Your Selections
          </h2>
          <div className="space-y-2 text-sm">
            <Row label="Category" value={category?.label || '—'} />
            <Row label="Design" value={design ? `${design.name}` : '—'} />
            <Row label="Fabric" value={fabric ? `${fabric.code} ${fabric.name}` : '—'} />
          </div>
          <div className="mt-3">
            <div className="mb-1.5 text-[11px] font-bold uppercase text-muted">Top Colors</div>
            <div className="flex flex-wrap gap-1.5">
              {selectedColors.slice(0, 6).map((c) => (
                <span
                  key={c.id}
                  className="h-7 w-7 rounded-full border border-black/10"
                  style={{ background: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-secondary text-xs" onClick={onChangeBackground}>
            CHANGE BACKGROUND
          </button>
          <button
            type="button"
            className="btn border border-line bg-white text-xs text-navy"
            onClick={onViewDetails}
          >
            VIEW DETAILS
          </button>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted">{label}</span>
      <strong className="max-w-[65%] text-right text-navy">{value}</strong>
    </div>
  );
}
