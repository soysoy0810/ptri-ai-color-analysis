import { motion } from 'framer-motion';
import { BookOpenText, Droplets, Palette, Shirt } from 'lucide-react';
import { CATEGORIES } from '../../data/catalog';
import { getDesignById } from '../../shared/lib/catalogStore';
import type { SkinProfile } from '../../shared/lib/colorEngine';
import type { PaletteColor, SessionSummary } from '../../shared/lib/types';

interface RecommendationScreenProps {
  summary: SessionSummary;
  skinProfile?: SkinProfile | null;
}

/**
 * Profile card copy. Prefers the real skin analysis from the camera;
 * falls back to deriving from the chosen colors.
 */
function colorProfile(
  colors: PaletteColor[],
  skin?: SkinProfile | null,
): { name: string; blurb: string } {
  if (skin) {
    const tone = skin.undertone[0].toUpperCase() + skin.undertone.slice(1);
    const depth = skin.depth[0].toUpperCase() + skin.depth.slice(1);
    const blurb =
      skin.undertone === 'warm'
        ? 'Your skin has golden warm undertones — earthy, golden and rich colors flatter you most.'
        : skin.undertone === 'cool'
          ? 'Your skin has cool rosy undertones — jewel tones, blues and crisp colors flatter you most.'
          : 'Your skin has balanced neutral undertones — both warm and cool colors work beautifully on you.';
    return { name: `${tone} – ${depth}`, blurb };
  }
  if (!colors.length) {
    return { name: 'Balanced', blurb: 'A versatile palette works well for you.' };
  }
  let r = 0;
  let g = 0;
  let b = 0;
  for (const c of colors) {
    const hex = c.hex.replace('#', '');
    r += parseInt(hex.slice(0, 2), 16);
    g += parseInt(hex.slice(2, 4), 16);
    b += parseInt(hex.slice(4, 6), 16);
  }
  r /= colors.length;
  g /= colors.length;
  b /= colors.length;
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const temp = r > b ? 'Warm' : 'Cool';
  const depth = luma < 110 ? 'Deep' : luma > 175 ? 'Light' : 'Soft';
  const blurb =
    temp === 'Cool'
      ? `Your best colors are ${depth.toLowerCase()}, rich and cool tones.`
      : `Your best colors are ${depth.toLowerCase()}, golden and warm tones.`;
  return { name: `${temp} – ${depth}`, blurb };
}

const TILES = [
  { icon: Palette, title: 'Best Colors', sub: 'Your top 20 palette' },
  { icon: Shirt, title: 'Best Fabrics', sub: 'PTRI textiles' },
  { icon: BookOpenText, title: 'Style Guide', sub: 'What suits you' },
  { icon: Droplets, title: 'Care Tips', sub: 'Keep it perfect' },
] as const;

export function RecommendationScreen({ summary, skinProfile }: RecommendationScreenProps) {
  const category = CATEGORIES.find((c) => c.id === summary.categoryId);
  const design = getDesignById(summary.designId);
  const fabric = summary.fabric;
  const profile = colorProfile(summary.colors, skinProfile);

  return (
    <section className="screen">
      <h1 className="screen-title">AI Recommendation</h1>
      <p className="screen-sub">Based on your analysis, these are our recommendations.</p>

      {/* Color profile card */}
      <motion.div
        className="rounded-2xl bg-gradient-to-br from-navy to-[#123a6b] p-4 text-white shadow-kiosk"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-sky-300">
          Your Color Profile
        </div>
        <div className="mt-1 text-2xl font-extrabold">{profile.name}</div>
        <p className="mt-1 text-[13px] font-medium text-white/85">{profile.blurb}</p>
        <div className="mt-3 flex gap-1.5">
          {summary.colors.slice(0, 10).map((c, i) => (
            <motion.span
              key={c.id}
              className="h-7 w-7 rounded-full border-2 border-white/25"
              style={{ background: c.hex }}
              title={c.name}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15 + i * 0.05 }}
            />
          ))}
        </div>
      </motion.div>

      {/* Recommended for you tiles */}
      <h2 className="mb-2.5 mt-5 text-[11px] font-extrabold uppercase tracking-wide text-muted">
        Recommended for You
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        {TILES.map((tile, i) => (
          <motion.div
            key={tile.title}
            className="flex flex-col items-center rounded-2xl border border-line bg-white p-4 text-center shadow-sm"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
          >
            <span className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
              <tile.icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <strong className="text-[13px] font-extrabold text-navy">{tile.title}</strong>
            <span className="text-[11px] font-medium text-muted">{tile.sub}</span>
          </motion.div>
        ))}
      </div>

      {/* Session summary */}
      <motion.div
        className="mt-4 space-y-2 rounded-2xl border border-line bg-white p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
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
      </motion.div>

      <p className="mt-4 text-xs text-muted">
        This is an AI-assisted style recommendation, not an absolute scientific classification.
      </p>
    </section>
  );
}
