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
import type { TextileId } from './textiles';

export const AGE_RANGES = [
  '18–24',
  '25–34',
  '35–44',
  '45–54',
  '55+',
  'Prefer not to say',
] as const;

export const GENDERS = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
] as const;

export const PURPOSES = ['Personal Use', 'Work / Uniform', 'Event', 'Gift', 'Just Exploring'] as const;

export interface AccessoryItem {
  id: string;
  categoryId: string;
  name: string;
  hex: string;
  accentHex?: string;
  pattern?: 'plain' | 'stripe' | 'weave' | 'print';
  /** Real textile photo used as cloth on the body and in swatches */
  textureId?: TextileId;
  /** Catalog product photo for the style board */
  photoSrc?: string;
}

export const ACCESSORY_CATEGORIES = [
  { id: 'earrings', label: 'Earrings' },
  { id: 'necklace', label: 'Necklace' },
  { id: 'bags', label: 'Bags' },
  { id: 'caps', label: 'Caps & Hats' },
  { id: 'scarf', label: 'Scarf' },
  { id: 'other', label: 'Other' },
] as const;

/** PTRI-inspired accessories — rendered on the visitor photo via landmark compositing */
export const ACCESSORY_ITEMS: AccessoryItem[] = [
  { id: 'ea-gold-hoop', categoryId: 'earrings', name: 'Gold Hoops', hex: '#D4AF37', pattern: 'plain', photoSrc: `${import.meta.env.BASE_URL}accessories/acc-gold-hoops.jpg` },
  { id: 'ea-pearl-drop', categoryId: 'earrings', name: 'Pearl Drops', hex: '#F3EEE2', pattern: 'plain' },
  { id: 'ea-silver-stud', categoryId: 'earrings', name: 'Silver Studs', hex: '#C7CCD1', pattern: 'plain' },
  { id: 'ea-rose-gold', categoryId: 'earrings', name: 'Rose Gold', hex: '#E3BFB4', pattern: 'plain' },

  { id: 'nk-pearl-strand', categoryId: 'necklace', name: 'Pearl Strand', hex: '#F3EEE2', pattern: 'plain' },
  { id: 'nk-gold-chain', categoryId: 'necklace', name: 'Gold Chain', hex: '#D4AF37', pattern: 'plain', photoSrc: `${import.meta.env.BASE_URL}accessories/acc-gold-pendant.jpg` },
  { id: 'nk-choker', categoryId: 'necklace', name: 'Beaded Choker', hex: '#8B5E3C', accentHex: '#C8A165', pattern: 'weave', textureId: 'yakan' },
  { id: 'nk-pendant', categoryId: 'necklace', name: 'Statement Pendant', hex: '#2F4858', pattern: 'plain' },

  { id: 'bg-woven-tote', categoryId: 'bags', name: 'Woven Tote', hex: '#C8A165', accentHex: '#8B5E3C', pattern: 'weave', textureId: 'abaca' },
  { id: 'bg-leather-clutch', categoryId: 'bags', name: 'Leather Clutch', hex: '#5B3A29', pattern: 'plain', photoSrc: `${import.meta.env.BASE_URL}accessories/acc-tan-bag.jpg` },
  { id: 'bg-black-shoulder', categoryId: 'bags', name: 'Black Shoulder Bag', hex: '#1A1A1A', pattern: 'plain' },
  { id: 'bg-sling', categoryId: 'bags', name: 'Sling Bag', hex: '#3E4A59', pattern: 'plain' },
  { id: 'bg-canvas', categoryId: 'bags', name: 'Canvas Bag', hex: '#D8CBB8', accentHex: '#A89278', pattern: 'weave', textureId: 'sinamay' },

  { id: 'cp-straw-hat', categoryId: 'caps', name: 'Straw Hat', hex: '#D9B98B', accentHex: '#B8956A', pattern: 'weave', textureId: 'sinamay' },
  { id: 'cp-baseball', categoryId: 'caps', name: 'Baseball Cap', hex: '#1E3A5F', pattern: 'plain', photoSrc: `${import.meta.env.BASE_URL}accessories/acc-navy-cap.jpg` },
  { id: 'cp-beret', categoryId: 'caps', name: 'Beret', hex: '#6B2C3E', pattern: 'plain' },

  { id: 'sc-piña-weave', categoryId: 'scarf', name: 'Piña Weave Scarf', hex: '#EDE4D3', accentHex: '#C9B99A', pattern: 'weave', textureId: 'pina' },
  { id: 'sc-silk-print', categoryId: 'scarf', name: 'Silk Print Scarf', hex: '#B5493E', accentHex: '#2F4858', pattern: 'print', textureId: 'silk-print' },
  { id: 'sc-inabel', categoryId: 'scarf', name: 'Inabel Stripe Scarf', hex: '#2F4858', accentHex: '#C8A165', pattern: 'stripe', textureId: 'inabel' },
  { id: 'sc-plain-linen', categoryId: 'scarf', name: 'Plain Linen Scarf', hex: '#DCD3C2', pattern: 'plain', textureId: 'jusi' },

  { id: 'ot-sunglasses', categoryId: 'other', name: 'Sunglasses', hex: '#2B2B2B', pattern: 'plain', photoSrc: `${import.meta.env.BASE_URL}accessories/acc-sunglasses.jpg` },
  { id: 'ot-sunglasses-square', categoryId: 'other', name: 'Square Sunglasses', hex: '#111111', pattern: 'plain' },
  { id: 'ot-watch', categoryId: 'other', name: 'Silver Watch', hex: '#A9A9A9', pattern: 'plain' },
  { id: 'ot-watch-rose', categoryId: 'other', name: 'Rose Gold Watch', hex: '#B76E79', pattern: 'plain' },
  { id: 'ot-belt', categoryId: 'other', name: 'Woven Belt', hex: '#7A5230', accentHex: '#C8A165', pattern: 'stripe', textureId: 'inabel' },
  { id: 'ot-belt-brown', categoryId: 'other', name: 'Brown Leather Belt', hex: '#5B3A29', pattern: 'plain' },
  { id: 'ot-belt-black', categoryId: 'other', name: 'Black Leather Belt', hex: '#1A1A1A', pattern: 'plain' },
  { id: 'ot-tie-navy', categoryId: 'other', name: 'Navy Tie', hex: '#1E3A5F', pattern: 'plain' },
  { id: 'ot-tie-burgundy', categoryId: 'other', name: 'Burgundy Tie', hex: '#6B2C3E', pattern: 'plain' },
];

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
    audience?: string;
  }>
).reduce<Record<string, DesignItem[]>>((acc, design) => {
  if (!acc[design.category_id]) acc[design.category_id] = [];
  acc[design.category_id].push({
    id: design.id,
    name: design.name,
    style: design.style_code,
    category_id: design.category_id,
    audience: design.audience || 'unisex',
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
  { id: 'still', label: 'Hold still', tip: 'Stay still while we prepare the scan' },
  { id: 'forward', label: 'Face forward', tip: 'Face the camera directly' },
  { id: 'light', label: 'Good lighting', tip: 'Stand in even lighting' },
] as const;

/** Full phrases as shown on the approved PTRI home mockup */
export const FEATURE_BULLETS = [
  { id: 'ai', title: 'AI-Powered Color Analysis' },
  { id: 'textiles', title: 'Textile Research & Innovation' },
  { id: 'personal', title: 'Personalized Recommendations' },
] as const;

/** 6-step journey tiles from the approved board (Welcome screen) */
export const JOURNEY_STEPS = [
  { id: 'start', title: 'Start Analysis', desc: 'Scan your face and let our AI analyze you.' },
  { id: 'skin', title: 'Skin Tone Detection', desc: 'Find the skin tones that best match your undertone.' },
  { id: 'colors', title: 'AI Color Recommendation', desc: 'Get AI-powered color palette just for you.' },
  { id: 'textiles', title: 'Explore Textiles', desc: 'Discover premium Philippine textiles and innovations.' },
  { id: 'style', title: 'Style Your Look', desc: 'Choose clothes and accessories that fit you best.' },
  { id: 'result', title: 'View Your Result', desc: 'Save, email or download your personalized look.' },
] as const;

/** Trust footer band from the approved board (Welcome screen) */
export const TRUST_PILLARS = [
  { id: 'research', title: 'Research & Innovation', desc: 'Advancing textile technology through research and development.' },
  { id: 'sustainable', title: 'Sustainable & Responsible', desc: 'Promoting eco-friendly and sustainable textile solutions.' },
  { id: 'nation', title: 'Nation Building', desc: 'Empowering communities and supporting local industries.' },
  { id: 'excellence', title: 'Excellence & Integrity', desc: 'Committed to quality, service and excellence.' },
] as const;
