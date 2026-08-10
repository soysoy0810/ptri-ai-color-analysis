/** Photoreal garment assets for design preview / try-on */

export type GarmentKey =
  | 'polo'
  | 'collar-blouse'
  | 'linen-shirt'
  | 'formal-shirt'
  | 'active-tee'
  | 'barong';

const BASE = `${import.meta.env.BASE_URL}garments`;

export const GARMENT_SRC: Record<GarmentKey, string> = {
  polo: `${BASE}/garment-polo.png`,
  'collar-blouse': `${BASE}/garment-collar-blouse.png`,
  'linen-shirt': `${BASE}/garment-linen-shirt.png`,
  'formal-shirt': `${BASE}/garment-formal-shirt.png`,
  'active-tee': `${BASE}/garment-active-tee.png`,
  barong: `${BASE}/garment-barong.png`,
};

/** Light neutral versions used for fabric-color tinting in the try-on */
export const GARMENT_BASE_SRC: Record<GarmentKey, string> = {
  polo: `${BASE}/garment-polo-base.png`,
  'collar-blouse': `${BASE}/garment-collar-blouse-base.png`,
  'linen-shirt': `${BASE}/garment-linen-shirt-base.png`,
  'formal-shirt': `${BASE}/garment-formal-shirt-base.png`,
  'active-tee': `${BASE}/garment-active-tee-base.png`,
  barong: `${BASE}/garment-barong-base.png`,
};

/** Map each catalog design id → garment photo */
export const DESIGN_GARMENT: Record<string, GarmentKey> = {
  // Uniform
  u1: 'polo',
  u2: 'barong',
  u3: 'collar-blouse',
  u4: 'polo',
  // Casual
  ca1: 'active-tee',
  ca2: 'linen-shirt',
  ca3: 'collar-blouse',
  ca4: 'polo',
  // Smart casual
  sc1: 'formal-shirt',
  sc2: 'polo',
  sc3: 'linen-shirt',
  sc4: 'collar-blouse',
  // Formal
  f1: 'formal-shirt',
  f2: 'collar-blouse',
  f3: 'formal-shirt',
  f4: 'barong',
  // Active
  a1: 'active-tee',
  a2: 'active-tee',
  a3: 'polo',
  a4: 'polo',
  // Fabrics only — show drape on a neutral top
  fb1: 'linen-shirt',
  fb2: 'collar-blouse',
  fb3: 'polo',
  fb4: 'barong',
};

export function garmentForDesign(designId: string | null | undefined): GarmentKey {
  if (designId && DESIGN_GARMENT[designId]) return DESIGN_GARMENT[designId];
  return 'polo';
}

/** Scene backdrops for preview environments */
export const BACKGROUND_SCENES: Record<string, { from: string; via: string; to: string; label: string }> = {
  studio: { from: '#eef3f8', via: '#dce6f2', to: '#c5d4e6', label: 'Studio' },
  office: { from: '#d4dde8', via: '#b8c7d9', to: '#8fa4bc', label: 'Office' },
  living: { from: '#f3ebe1', via: '#e2d2bf', to: '#c9b49a', label: 'Living Room' },
  outdoor: { from: '#d7e8d2', via: '#a8c9a0', to: '#6f9a6a', label: 'Outdoor' },
  lab: { from: '#e8eef5', via: '#cfd8e4', to: '#a8b6c8', label: 'Laboratory' },
  travel: { from: '#f5ebe0', via: '#e0c9a8', to: '#c4a574', label: 'Travel' },
};

/** Real photo backdrops for preview environments */
const BG_BASE = `${import.meta.env.BASE_URL}backgrounds`;
export const BACKGROUND_SRC: Record<string, string> = {
  studio: `${BG_BASE}/bg-studio.png`,
  office: `${BG_BASE}/bg-office.png`,
  living: `${BG_BASE}/bg-living.png`,
  outdoor: `${BG_BASE}/bg-outdoor.png`,
  lab: `${BG_BASE}/bg-lab.png`,
  travel: `${BG_BASE}/bg-travel.png`,
};
