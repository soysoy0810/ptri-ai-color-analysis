import { CATEGORIES, DESIGNS } from '../../data/catalog';
import type { SessionSummary } from '../../shared/lib/types';

interface RecommendationScreenProps {
  summary: SessionSummary;
}

export function RecommendationScreen({ summary }: RecommendationScreenProps) {
  const category = CATEGORIES.find((c) => c.id === summary.categoryId);
  const design =
    (summary.categoryId &&
      DESIGNS[summary.categoryId]?.find((d) => d.id === summary.designId)) ||
    undefined;
  const fabric = summary.fabric;

  return (
    <section className="screen">
      <h1 className="screen-title">AI Recommendation</h1>
      <p className="screen-sub">
        Best matches based on your color profile, selected design, and PTRI textile catalog.
      </p>

      <div className="space-y-2 rounded-2xl border border-line bg-white p-4">
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-muted">For</span>
          <strong className="text-navy">{summary.name || 'Guest'}</strong>
        </div>
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-muted">Design</span>
          <strong className="text-right text-navy">
            {design?.name || '—'} ({category?.label || '—'})
          </strong>
        </div>
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-muted">Fabric</span>
          <strong className="text-navy">{fabric?.name || '—'}</strong>
        </div>
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-muted">Match</span>
          <strong className="text-accent">{fabric?.match ?? '—'}%</strong>
        </div>
      </div>

      <h2 className="mb-2.5 mt-5 text-base font-bold text-navy">Your selected colors</h2>
      <div className="grid grid-cols-4 gap-2.5">
        {summary.colors.map((color) => (
          <div
            key={color.id}
            className="swatch"
            style={{ background: color.hex }}
            title={color.name}
          />
        ))}
      </div>

      <p className="mt-4 text-xs text-muted">
        This is an AI-assisted style recommendation, not an absolute scientific classification.
      </p>
    </section>
  );
}
