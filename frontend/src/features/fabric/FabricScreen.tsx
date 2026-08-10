import type { FabricItem } from '../../shared/lib/types';

interface FabricScreenProps {
  fabrics: FabricItem[];
  selectedId: string | null;
  onSelect: (fabricId: string) => void;
}

export function FabricScreen({ fabrics, selectedId, onSelect }: FabricScreenProps) {
  return (
    <section className="screen">
      <h1 className="screen-title">Select PTRI Fabric</h1>
      <p className="screen-sub">Approved PTRI textiles ranked by match to your selected colors.</p>

      <div className="grid gap-2.5">
        {fabrics.map((fabric) => (
          <button
            key={fabric.id}
            type="button"
            className={`tile grid grid-cols-[56px_1fr_auto] items-center gap-3 ${
              selectedId === fabric.id ? 'active' : ''
            }`}
            onClick={() => onSelect(fabric.id)}
          >
            <span
              className="h-14 w-14 rounded-xl shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
              style={{ background: fabric.hex }}
            />
            <span className="text-left">
              <strong className="block text-sm font-bold text-navy">{fabric.name}</strong>
              <span className="text-xs text-muted">{fabric.code}</span>
            </span>
            <strong className="text-base font-extrabold text-accent">{fabric.match}%</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
