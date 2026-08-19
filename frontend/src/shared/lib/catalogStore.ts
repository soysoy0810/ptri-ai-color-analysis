import type { DesignItem } from './types';
import { DESIGNS as STATIC_DESIGNS } from '../../data/catalog';
import {
  DESIGN_GARMENT,
  GARMENT_BASE_SRC,
  GARMENT_SRC,
  LOOK_SRC,
  LOOK_VTON,
  garmentForDesign,
  type GarmentKey,
} from '../../data/garments';

type ApiDesign = {
  id: string;
  category_id: string;
  name: string;
  style_code?: string | null;
  audience?: string | null;
  garment_type?: string | null;
  preview_url?: string | null;
  tryon_url?: string | null;
  is_active?: boolean;
};

let liveByCategory: Record<string, DesignItem[]> | null = null;
let liveById = new Map<string, DesignItem>();

function normalizeDesign(row: ApiDesign): DesignItem {
  const garmentType = DESIGN_GARMENT[row.id] || (row.garment_type as GarmentKey | null) || 'polo';
  return {
    id: row.id,
    category_id: row.category_id,
    name: row.name,
    style: row.style_code || '',
    audience: row.audience || 'unisex',
    garment_type: garmentType,
    preview_url: row.preview_url || null,
    tryon_url: row.tryon_url || null,
  };
}

export function setLiveDesigns(rows: ApiDesign[]): void {
  liveByCategory = {};
  liveById = new Map();
  for (const row of rows) {
    if (row.is_active === false) continue;
    const design = normalizeDesign(row);
    liveById.set(design.id, design);
    if (!liveByCategory[design.category_id]) liveByCategory[design.category_id] = [];
    liveByCategory[design.category_id].push(design);
  }
}

function staticDesigns(): DesignItem[] {
  return Object.values(STATIC_DESIGNS).flat();
}

export function getAllDesigns(): DesignItem[] {
  const bundled = staticDesigns();
  if (!liveByCategory) return bundled;
  const byId = new Map<string, DesignItem>();
  for (const design of Object.values(liveByCategory).flat()) byId.set(design.id, design);
  for (const design of bundled) {
    const live = byId.get(design.id);
    byId.set(
      design.id,
      live
        ? { ...live, name: design.name, audience: design.audience, category_id: design.category_id }
        : design,
    );
  }
  return Array.from(byId.values());
}

export function getDesignsForCategory(categoryId: string): DesignItem[] {
  return getAllDesigns().filter((d) => d.category_id === categoryId);
}

export function designsForVisitor(gender?: string | null): DesignItem[] {
  const all = getAllDesigns();
  if (gender !== 'male' && gender !== 'female') return all;
  return all.filter((d) => !d.audience || d.audience === 'unisex' || d.audience === gender);
}

export function getDesignById(designId: string | null | undefined): DesignItem | undefined {
  if (!designId) return undefined;
  return getAllDesigns().find((d) => d.id === designId);
}

export function resolveGarmentKey(designId: string | null | undefined): GarmentKey {
  const design = getDesignById(designId);
  if (design?.garment_type) return design.garment_type as GarmentKey;
  return garmentForDesign(designId);
}

export function resolvePreviewUrl(designId: string | null | undefined): string | null {
  if (designId && LOOK_SRC[designId]) return LOOK_SRC[designId];
  const design = getDesignById(designId);
  if (design?.preview_url) return design.preview_url;
  const key = resolveGarmentKey(designId);
  return GARMENT_SRC[key];
}

export function resolveLookUrl(designId: string | null | undefined): string | null {
  if (designId && LOOK_SRC[designId]) return LOOK_SRC[designId];
  // Heritage garments use dedicated isolated PNGs — do not fall back
  // to a mismatched look photo (that was showing a grey tank / wrong dress).
  const key = resolveGarmentKey(designId);
  if (key === 'terno' || key === 'filipiniana-blouse' || key === 'barong') return null;
  return null;
}

export function resolveTryonUrl(designId: string | null | undefined): string | null {
  const design = getDesignById(designId);
  return design?.tryon_url || null;
}

/** Isolated garment product photo for generative try-on — never a look/model photo. */
export function resolveVtonGarmentUrl(designId: string | null | undefined): string | null {
  if (designId && LOOK_VTON[designId]) return LOOK_VTON[designId].src;
  const design = getDesignById(designId);
  // Admin tryon_url is only used when it is an isolated garment, not a look card.
  if (design?.tryon_url && !/\/looks\//.test(design.tryon_url)) return design.tryon_url;
  const key = resolveGarmentKey(designId);
  return GARMENT_BASE_SRC[key] || GARMENT_SRC[key] || null;
}

export function vtonCategoryForDesign(designId: string | null | undefined): 'upper_body' | 'lower_body' | 'dresses' {
  if (designId && LOOK_VTON[designId]) return LOOK_VTON[designId].category;
  return vtonCategoryForGarment(resolveGarmentKey(designId));
}

export function vtonDescriptionForDesign(designId: string | null | undefined, fallback: string): string {
  if (designId && LOOK_VTON[designId]) return LOOK_VTON[designId].description;
  return fallback;
}

export function vtonCategoryForGarment(garmentKey: GarmentKey): 'upper_body' | 'lower_body' | 'dresses' {
  if (garmentKey === 'terno') return 'dresses';
  return 'upper_body';
}
