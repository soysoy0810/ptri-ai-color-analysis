import palette from '../../../shared/catalog/palette.json';
import categories from '../../../shared/catalog/categories.json';
import fabrics from '../../../shared/catalog/fabrics.json';
import designs from '../../../shared/catalog/designs.json';
import backgrounds from '../../../shared/catalog/backgrounds.json';
import type {
  BackgroundItem,
  CategoryItem,
  DesignItem,
  FabricItem,
  PaletteColor,
} from '../shared/lib/types';

export const AGE_RANGES = [
  '18–24',
  '25–34',
  '35–44',
  '45–54',
  '55+',
  'Prefer not to say',
] as const;

export const GENDERS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'prefer_not', label: 'Prefer not to say' },
] as const;

export const APPROVED_PALETTE = palette as PaletteColor[];
export const CATEGORIES = categories as CategoryItem[];
export const FABRICS = fabrics as FabricItem[];
export const BACKGROUNDS = backgrounds as BackgroundItem[];

export const DESIGNS = (
  designs as Array<{
    id: string;
    category_id: string;
    name: string;
    style_code: string;
  }>
).reduce<Record<string, DesignItem[]>>((acc, design) => {
  if (!acc[design.category_id]) acc[design.category_id] = [];
  acc[design.category_id].push({
    id: design.id,
    name: design.name,
    style: design.style_code,
    category_id: design.category_id,
  });
  return acc;
}, {});

export const ANALYSIS_STEPS = [
  'Detecting face',
  'Analyzing skin tone',
  'Extracting color palette',
  'Matching best colors',
  'Generating recommendations',
] as const;

export const CAMERA_GUIDE = [
  { id: 'glasses', label: 'No glasses', tip: 'Remove glasses if possible' },
  { id: 'forward', label: 'Face forward', tip: 'Face the camera directly' },
  { id: 'hair', label: 'Hair away', tip: 'Keep hair away from the face' },
  { id: 'light', label: 'Good lighting', tip: 'Stand in even lighting' },
] as const;

/** Full phrases as shown on the approved PTRI home mockup */
export const FEATURE_BULLETS = [
  { id: 'ai', title: 'AI-Powered Color Analysis' },
  { id: 'textiles', title: 'PTRI Textiles & Innovation' },
  { id: 'personal', title: 'Personalized Recommendations' },
] as const;
