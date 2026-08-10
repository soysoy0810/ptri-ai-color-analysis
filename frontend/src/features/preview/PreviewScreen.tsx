import { motion } from 'framer-motion';
import { ImageIcon, Sparkles } from 'lucide-react';
import { CATEGORIES, DESIGNS, FABRICS } from '../../data/catalog';
import { garmentForDesign } from '../../data/garments';
import type { FaceRegion, PaletteColor } from '../../shared/lib/types';
import { LookComposer } from '../../shared/ui/LookComposer';

interface PreviewScreenProps {
  captureDataUrl: string | null;
  faceBox: FaceRegion | null;
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
  faceBox,
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
      <h1 className="screen-title">This is how it looks on you.</h1>

      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
        <LookComposer
          captureDataUrl={captureDataUrl}
          faceBox={faceBox}
          garmentKey={garmentKey}
          fabricHex={garmentColor}
          backgroundId={backgroundId}
          designName={design?.name}
        />
      </motion.div>

      {/* YOUR SELECTIONS panel */}
      <motion.div
        className="mt-3 rounded-2xl border border-line bg-white p-4 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-muted">
          Your Selections
        </h2>
        <div className="space-y-2 text-sm">
          <Row label="Category" value={category?.label || '—'} />
          <Row label="Design" value={design ? design.name : '—'} />
          <Row label="Fabric" value={fabric ? `PTRI ${fabric.code} · ${fabric.name}` : '—'} />
        </div>
        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-bold uppercase text-muted">Top Colors</div>
          <div className="flex flex-wrap gap-1.5">
            {selectedColors.slice(0, 10).map((c, i) => (
              <motion.span
                key={c.id}
                className="h-8 w-8 rounded-full border border-black/10 shadow-sm"
                style={{ background: c.hex }}
                title={c.name}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-secondary text-xs" onClick={onChangeBackground}>
          <ImageIcon className="h-4 w-4" />
          CHANGE BACKGROUND
        </button>
        <button type="button" className="btn btn-accent text-xs" onClick={onViewDetails}>
          <Sparkles className="h-4 w-4" />
          VIEW RECOMMENDATION
        </button>
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
