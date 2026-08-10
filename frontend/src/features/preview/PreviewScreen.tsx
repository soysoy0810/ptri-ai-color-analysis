import { CATEGORIES, DESIGNS, FABRICS } from '../../data/catalog';
import { garmentForDesign } from '../../data/garments';
import type { PaletteColor } from '../../shared/lib/types';
import { LookComposer } from '../../shared/ui/LookComposer';

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
  const fabric = FABRICS.find((f) => f.id === fabricId);
  const garmentColor = fabric?.hex || selectedColors[0]?.hex || '#1E4D8C';
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const design = (categoryId && DESIGNS[categoryId]?.find((d) => d.id === designId)) || undefined;
  const garmentKey = garmentForDesign(designId);

  return (
    <section className="screen">
      <h1 className="screen-title">Preview Your Look</h1>
      <p className="screen-sub">Your face with the selected garment, fabric color, and scene.</p>

      <div className="mt-2 grid gap-3">
        <LookComposer
          captureDataUrl={captureDataUrl}
          garmentKey={garmentKey}
          fabricHex={garmentColor}
          backgroundId={backgroundId}
          designName={design?.name}
        />

        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-muted">
            Your Selections
          </h2>
          <div className="space-y-2 text-sm">
            <Row label="Category" value={category?.label || '—'} />
            <Row label="Design" value={design ? design.name : '—'} />
            <Row label="Fabric" value={fabric ? `${fabric.code} ${fabric.name}` : '—'} />
          </div>
          <div className="mt-3">
            <div className="mb-1.5 text-[11px] font-bold uppercase text-muted">Top Colors</div>
            <div className="flex flex-wrap gap-1.5">
              {selectedColors.slice(0, 6).map((c) => (
                <span
                  key={c.id}
                  className="h-8 w-8 rounded-full border border-black/10 shadow-sm"
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
