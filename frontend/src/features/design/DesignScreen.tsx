import { DESIGNS } from '../../data/catalog';
import { DESIGN_GARMENT, GARMENT_SRC, garmentForDesign } from '../../data/garments';

interface DesignScreenProps {
  categoryId: string | null;
  selectedId: string | null;
  onSelect: (designId: string) => void;
}

export function DesignScreen({ categoryId, selectedId, onSelect }: DesignScreenProps) {
  const designs = (categoryId && DESIGNS[categoryId]) || [];

  return (
    <section className="screen">
      <h1 className="screen-title">Select Design</h1>
      <p className="screen-sub">Choose a real garment style from the approved catalog.</p>

      <div className="grid grid-cols-2 gap-3">
        {designs.map((design) => {
          const key = DESIGN_GARMENT[design.id] || garmentForDesign(design.id);
          const src = GARMENT_SRC[key];
          const active = selectedId === design.id;
          return (
            <button
              key={design.id}
              type="button"
              className={`overflow-hidden rounded-2xl border-2 bg-white p-2 text-left shadow-sm transition active:scale-[0.985] ${
                active ? 'border-accent shadow-[0_0_0_3px_rgba(47,128,237,0.15)]' : 'border-line'
              }`}
              onClick={() => onSelect(design.id)}
            >
              <div className="mb-2 flex h-[120px] items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-accent-soft to-white">
                <img
                  src={src}
                  alt={design.name}
                  className="h-[112px] w-auto object-contain drop-shadow-md"
                  draggable={false}
                />
              </div>
              <strong className="block text-sm font-bold text-navy">{design.name}</strong>
              <span className="text-xs text-muted">Style {design.style}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
