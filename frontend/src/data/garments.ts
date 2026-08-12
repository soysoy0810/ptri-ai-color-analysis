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

export function garmentForDesign(
  designId: string | null | undefined,
  garmentType?: string | null,
): GarmentKey {
  if (garmentType && garmentType in GARMENT_SRC) return garmentType as GarmentKey;
  if (designId && DESIGN_GARMENT[designId]) return DESIGN_GARMENT[designId];
  return 'polo';
}

/** Waist-up template photos — person already wearing shirt, hands/arms visible */
export const TRYON_TEMPLATE_SRC: Record<ModelGender, string> = {
  female: `${MODEL_BASE}/template-female-studio.png`,
  male: `${MODEL_BASE}/template-male-office.png`,
};

/** Garments that need the standing model + overlay (unique silhouettes) */
export const HERITAGE_GARMENTS: GarmentKey[] = ['barong', 'terno', 'filipiniana-blouse'];

/** Torso tint region on waist-up template photos (% of template image) */
export const TEMPLATE_TORSO_MASK: Record<GarmentKey, TorsoMask> = {
  polo: { top: 0.22, bottom: 0.78, widthTop: 0.9, widthBottom: 0.72 },
  'active-tee': { top: 0.21, bottom: 0.77, widthTop: 0.9, widthBottom: 0.74 },
  'linen-shirt': { top: 0.2, bottom: 0.79, widthTop: 0.92, widthBottom: 0.74 },
  'formal-shirt': { top: 0.2, bottom: 0.8, widthTop: 0.93, widthBottom: 0.76 },
  barong: { top: 0.18, bottom: 0.82, widthTop: 0.94, widthBottom: 0.78 },
  'collar-blouse': { top: 0.22, bottom: 0.78, widthTop: 0.9, widthBottom: 0.72 },
  terno: { top: 0.18, bottom: 0.82, widthTop: 0.94, widthBottom: 0.78 },
  'filipiniana-blouse': { top: 0.2, bottom: 0.8, widthTop: 0.92, widthBottom: 0.76 },
};

export function modelGenderFromProfile(gender: string | null | undefined): ModelGender {
  if (gender === 'male') return 'male';
  return 'female';
}

export function tryOnModelSrc(gender: ModelGender, garmentKey: GarmentKey): string {
  if (HERITAGE_GARMENTS.includes(garmentKey)) {
    return MODEL_SRC[gender];
  }
  return TRYON_TEMPLATE_SRC[gender];
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

/** Visitor face placement on waist-up template photos */
export const FACE_ON_MODEL: Record<ModelGender, { top: number; width: number }> = {
  female: { top: 0.06, width: 0.24 },
  male: { top: 0.065, width: 0.25 },
};

/** Waist-up portrait: where the visitor face sits on each garment */
export interface GarmentPortraitLayout {
  /** Neckline position on the drawn garment (0 = top) */
  neckY: number;
  /** Face width as fraction of portrait width */
  faceWidth: number;
  /** Chin overlap — fraction of face height below neckline */
  chinAt: number;
}

export const GARMENT_PORTRAIT: Record<GarmentKey, GarmentPortraitLayout> = {
  polo: { neckY: 0.1, faceWidth: 0.38, chinAt: 0.82 },
  'active-tee': { neckY: 0.1, faceWidth: 0.38, chinAt: 0.82 },
  'linen-shirt': { neckY: 0.11, faceWidth: 0.37, chinAt: 0.83 },
  'formal-shirt': { neckY: 0.1, faceWidth: 0.37, chinAt: 0.82 },
  barong: { neckY: 0.14, faceWidth: 0.4, chinAt: 0.84 },
  'collar-blouse': { neckY: 0.12, faceWidth: 0.39, chinAt: 0.83 },
  terno: { neckY: 0.2, faceWidth: 0.42, chinAt: 0.86 },
  'filipiniana-blouse': { neckY: 0.17, faceWidth: 0.4, chinAt: 0.85 },
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
