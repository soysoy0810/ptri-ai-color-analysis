import { BACKGROUNDS } from '../../data/catalog';

interface BackgroundScreenProps {
  selectedId: string;
  onSelect: (backgroundId: string) => void;
}

export function BackgroundScreen({ selectedId, onSelect }: BackgroundScreenProps) {
  return (
    <section className="screen">
      <h1 className="screen-title">Select Background</h1>
      <p className="screen-sub">
        Choose an environment for your look preview. Backgrounds are for presentation only.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {BACKGROUNDS.map((bg) => (
          <button
            key={bg.id}
            type="button"
            className={`tile ${selectedId === bg.id ? 'active' : ''}`}
            onClick={() => onSelect(bg.id)}
          >
            <div
              className="mb-2.5 h-[72px] rounded-xl border border-black/5"
              style={{ background: bg.tone }}
            />
            <strong className="text-sm font-bold text-navy">{bg.label}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
