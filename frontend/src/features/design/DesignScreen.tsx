import { DESIGNS } from '../../data/catalog';

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
      <p className="screen-sub">Choose a garment design from the approved catalog.</p>

      <div className="grid grid-cols-2 gap-3">
        {designs.map((design) => (
          <button
            key={design.id}
            type="button"
            className={`tile ${selectedId === design.id ? 'active' : ''}`}
            onClick={() => onSelect(design.id)}
          >
            <div className="mb-2.5 h-[90px] rounded-xl bg-gradient-to-br from-accent-soft via-sky-300 to-navy" />
            <strong className="block text-sm font-bold text-navy">{design.name}</strong>
            <span className="text-xs text-muted">Style {design.style}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
