/** Photoreal garment assets for design preview / try-on */

export type GarmentKey =
  | 'polo'
  | 'collar-blouse'
  | 'linen-shirt'
  | 'formal-shirt'
  | 'active-tee'
  | 'barong'
  | 'terno'
  | 'filipiniana-blouse';

export type ModelGender = 'male' | 'female';

const BASE = `${import.meta.env.BASE_URL}garments`;
const MODEL_BASE = `${import.meta.env.BASE_URL}models`;

/** Full-body standing models — hands visible, used for realistic try-on */
export const MODEL_SRC: Record<ModelGender, string> = {
  female: `${MODEL_BASE}/model-female-standing.png`,
  male: `${MODEL_BASE}/model-male-standing.png`,
};

export const GARMENT_SRC: Record<GarmentKey, string> = {
  polo: `${BASE}/garment-polo.png`,
  'collar-blouse': `${BASE}/garment-collar-blouse.png`,
  'linen-shirt': `${BASE}/garment-linen-shirt.png`,
  'formal-shirt': `${BASE}/garment-formal-shirt.png`,
  'active-tee': `${BASE}/garment-active-tee.png`,
  barong: `${BASE}/garment-barong.png`,
  terno: `${BASE}/garment-terno.png`,
  'filipiniana-blouse': `${BASE}/garment-filipiniana-blouse.png`,
};

/** Light neutral versions used for fabric-color tinting in the try-on */
export const GARMENT_BASE_SRC: Record<GarmentKey, string> = {
  polo: `${BASE}/garment-polo-base.png`,
  'collar-blouse': `${BASE}/garment-collar-blouse-base.png`,
  'linen-shirt': `${BASE}/garment-linen-shirt-base.png`,
  'formal-shirt': `${BASE}/garment-formal-shirt-base.png`,
  'active-tee': `${BASE}/garment-active-tee-base.png`,
  barong: `${BASE}/garment-barong-base.png`,
  terno: `${BASE}/garment-terno-base.png`,
  'filipiniana-blouse': `${BASE}/garment-filipiniana-blouse-base.png`,
};

/** Map each catalog design id → garment photo */
export const DESIGN_GARMENT: Record<string, GarmentKey> = {
  fp1: 'barong',
  fp2: 'terno',
  fp3: 'filipiniana-blouse',
  fp4: 'terno',
  u1: 'polo',
  u2: 'barong',
  u3: 'collar-blouse',
  u4: 'polo',
  ca1: 'active-tee',
  ca2: 'linen-shirt',
  ca3: 'collar-blouse',
  ca4: 'polo',
  sc1: 'formal-shirt',
  sc2: 'polo',
  sc3: 'linen-shirt',
  sc4: 'collar-blouse',
  f1: 'formal-shirt',
  f2: 'collar-blouse',
  f3: 'formal-shirt',
  f4: 'barong',
  a1: 'active-tee',
  a2: 'active-tee',
  a3: 'polo',
  a4: 'polo',
  fb1: 'linen-shirt',
  fb2: 'collar-blouse',
  fb3: 'polo',
  fb4: 'barong',
};

export function garmentForDesign(designId: string | null | undefined): GarmentKey {
  if (designId && DESIGN_GARMENT[designId]) return DESIGN_GARMENT[designId];
  return 'polo';
}

/** Resolve kiosk gender string → model photo */
export function modelGenderFromProfile(gender: string | null | undefined): ModelGender {
  if (gender === 'male') return 'male';
  return 'female';
}

/**
 * Torso recolor region on the standing model (% of model bounding box).
 * Replaces the old floating-garment overlay — tints the shirt already on the model photo.
 */
export interface TorsoMask {
  /** Y where the shirt neckline starts */
  top: number;
  /** Y where the shirt hem ends */
  bottom: number;
  /** Shoulder width as fraction of model width */
  widthTop: number;
  /** Waist width as fraction of model width */
  widthBottom: number;
}

export const TORSO_MASK: Record<GarmentKey, TorsoMask> = {
  polo: { top: 0.135, bottom: 0.36, widthTop: 0.36, widthBottom: 0.34 },
  'active-tee': { top: 0.13, bottom: 0.355, widthTop: 0.37, widthBottom: 0.35 },
  'linen-shirt': { top: 0.125, bottom: 0.38, widthTop: 0.38, widthBottom: 0.36 },
  'formal-shirt': { top: 0.12, bottom: 0.385, widthTop: 0.39, widthBottom: 0.37 },
  barong: { top: 0.115, bottom: 0.48, widthTop: 0.4, widthBottom: 0.42 },
  'collar-blouse': { top: 0.13, bottom: 0.37, widthTop: 0.36, widthBottom: 0.34 },
  terno: { top: 0.105, bottom: 0.52, widthTop: 0.44, widthBottom: 0.46 },
  'filipiniana-blouse': { top: 0.12, bottom: 0.4, widthTop: 0.4, widthBottom: 0.38 },
};

/** Visitor face placement on the model head (% of model bounding box) */
export const FACE_ON_MODEL: Record<ModelGender, { top: number; width: number }> = {
  female: { top: 0.028, width: 0.27 },
  male: { top: 0.032, width: 0.28 },
};

/** Scene backdrops for preview environments */
export const BACKGROUND_SCENES: Record<string, { from: string; via: string; to: string; label: string }> = {
  studio: { from: '#eef3f8', via: '#dce6f2', to: '#c5d4e6', label: 'Studio' },
  office: { from: '#d4dde8', via: '#b8c7d9', to: '#8fa4bc', label: 'Office' },
  living: { from: '#f3ebe1', via: '#e2d2bf', to: '#c9b49a', label: 'Living Room' },
  outdoor: { from: '#d7e8d2', via: '#a8c9a0', to: '#6f9a6a', label: 'Outdoor' },
  lab: { from: '#e8eef5', via: '#cfd8e4', to: '#a8b6c8', label: 'Laboratory' },
  travel: { from: '#f5ebe0', via: '#e0c9a8', to: '#c4a574', label: 'Travel' },
};

const BG_BASE = `${import.meta.env.BASE_URL}backgrounds`;
export const BACKGROUND_SRC: Record<string, string> = {
  studio: `${BG_BASE}/bg-studio.png`,
  office: `${BG_BASE}/bg-office.png`,
  living: `${BG_BASE}/bg-living.png`,
  outdoor: `${BG_BASE}/bg-outdoor.png`,
  lab: `${BG_BASE}/bg-lab.png`,
  travel: `${BG_BASE}/bg-travel.png`,
};
