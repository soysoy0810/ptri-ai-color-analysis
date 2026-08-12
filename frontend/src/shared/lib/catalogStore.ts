import type { DesignItem } from './types';
import { DESIGNS as STATIC_DESIGNS } from '../../data/catalog';
import {
  DESIGN_GARMENT,
  GARMENT_SRC,
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
  const garmentType = (row.garment_type as GarmentKey | null) || DESIGN_GARMENT[row.id] || 'polo';
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

export function getDesignsForCategory(categoryId: string): DesignItem[] {
  if (liveByCategory?.[categoryId]?.length) return liveByCategory[categoryId];
  return STATIC_DESIGNS[categoryId] || [];
}

export function getDesignById(designId: string | null | undefined): DesignItem | undefined {
  if (!designId) return undefined;
  return liveById.get(designId) || findStaticDesign(designId);
}

function findStaticDesign(designId: string): DesignItem | undefined {
  for (const list of Object.values(STATIC_DESIGNS)) {
    const hit = list.find((d) => d.id === designId);
    if (hit) return hit;
  }
  return undefined;
}

export function resolveGarmentKey(designId: string | null | undefined): GarmentKey {
  const design = getDesignById(designId);
  if (design?.garment_type) return design.garment_type as GarmentKey;
  return garmentForDesign(designId);
}

export function resolvePreviewUrl(designId: string | null | undefined): string | null {
  const design = getDesignById(designId);
  if (design?.preview_url) return design.preview_url;
  const key = resolveGarmentKey(designId);
  return GARMENT_SRC[key];
}

export function resolveTryonUrl(designId: string | null | undefined): string | null {
  const design = getDesignById(designId);
  return design?.tryon_url || null;
}
