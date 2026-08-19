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

const BASE = `${import.meta.env.BASE_URL}garments`;

const LOOK_BASE = `${import.meta.env.BASE_URL}looks`;

/** Full-body outfit cards — same idea as the style-board mockup */
export const LOOK_SRC: Record<string, string> = {
  lk1: `${LOOK_BASE}/look-blush-suit.jpg`,
  lk2: `${LOOK_BASE}/look-beige-dress.jpg`,
  lk3: `${LOOK_BASE}/look-olive-blouse.jpg`,
  lk4: `${LOOK_BASE}/look-navy-dress.jpg`,
  lk5: `${LOOK_BASE}/look-navy-jumpsuit.jpg`,
  wf1: `${LOOK_BASE}/look-navy-dress.jpg`,
  wf2: `${LOOK_BASE}/look-navy-dress.jpg`,
  wc6: `${LOOK_BASE}/look-beige-dress.jpg`,
};

export const FEATURED_LOOK_IDS_FEMALE = [
  'fp2',
  'fp4',
  'fp3',
  'fp8',
  'fp9',
  'wf1',
  'wn1',
  'lk4',
  'wc6',
  'wc1',
] as const;
export const FEATURED_LOOK_IDS_MALE = [
  'fp1',
  'fm1',
  'fm2',
  'fm3',
  'mf3',
  'mf5',
  'mc2',
  'mc1',
  'mn1',
  'mn6',
] as const;
export const FEATURED_LOOK_IDS = FEATURED_LOOK_IDS_FEMALE;

export function featuredLookIdsFor(gender?: string | null): readonly string[] {
  return gender === 'male' ? FEATURED_LOOK_IDS_MALE : FEATURED_LOOK_IDS_FEMALE;
}

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

/** Isolated clothing references for featured looks — never a model/person photo. */
export const LOOK_VTON: Record<
  string,
  { src: string; category: 'upper_body' | 'lower_body' | 'dresses'; description: string }
> = {
  lk1: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'blush tailored blazer worn as a fitted jacket',
  },
  lk2: {
    src: `${BASE}/garment-lk4-dress.png`,
    category: 'dresses',
    description: 'beige short-sleeve shirt dress with a matching waist belt, knee length',
  },
  lk3: {
    src: `${BASE}/garment-lk3-top.png`,
    category: 'upper_body',
    description: 'olive short-sleeve V-neck blouse worn on the torso',
  },
  lk4: {
    src: `${BASE}/garment-lk4-dress.png`,
    category: 'dresses',
    description: 'navy long-sleeve V-neck midi dress with a twisted waist and flared skirt',
  },
  lk5: {
    src: `${BASE}/garment-lk5-jumpsuit.png`,
    category: 'dresses',
    description: 'navy sleeveless wrap jumpsuit with wide-leg trousers',
  },
  wn1: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'crisp white long-sleeve button-down shirt tucked into black wide-leg trousers',
  },
  wn2: {
    src: `${BASE}/garment-collar-blouse-base.png`,
    category: 'upper_body',
    description: 'light blue long-sleeve office blouse tucked into navy trousers',
  },
  wn3: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'grey tailored blazer worn over a white top with matching trousers',
  },
  wn4: {
    src: `${BASE}/garment-collar-blouse-base.png`,
    category: 'upper_body',
    description: 'white button-down shirt tucked into camel tailored trousers',
  },
  wn5: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'navy pinstripe suit jacket and trousers over a tan blouse',
  },
  wn6: {
    src: `${BASE}/garment-collar-blouse-base.png`,
    category: 'upper_body',
    description: 'olive long-sleeve office shirt tucked into matching olive trousers',
  },
  wn7: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'black tailored blazer over a grey top with black trousers',
  },
  wn8: {
    src: `${BASE}/garment-collar-blouse-base.png`,
    category: 'upper_body',
    description: 'lavender pointed-collar blouse tucked into dusty rose trousers',
  },
  wn9: {
    src: `${BASE}/garment-lk4-dress.png`,
    category: 'dresses',
    description: 'dark emerald knee-length sheath dress with three-quarter sleeves',
  },
  mn1: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'white long-sleeve button-down shirt worn with beige chinos',
  },
  mn2: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'sky blue long-sleeve button-down shirt worn with beige chinos',
  },
  mn3: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'navy long-sleeve button-down shirt worn with beige chinos',
  },
  mn4: {
    src: `${BASE}/garment-linen-shirt-base.png`,
    category: 'upper_body',
    description: 'olive long-sleeve button-down shirt worn with beige chinos',
  },
  mn5: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'maroon long-sleeve Giza cotton shirt worn with navy ankle trousers',
  },
  mn6: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'white dress shirt tucked into navy tailored trousers',
  },
  mn7: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'light pink dress shirt tucked into navy tailored trousers',
  },
  mn8: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'black dress shirt tucked into light grey tailored trousers',
  },
  mn9: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'navy wool suit shirt and jacket, business formal',
  },
  mn10: {
    src: `${BASE}/garment-linen-shirt-base.png`,
    category: 'upper_body',
    description: 'lightweight linen button-down shirt for warm weather',
  },
  mn11: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'black long-sleeve button-down shirt worn with beige chinos',
  },
  mn12: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'pale pink long-sleeve button-down shirt worn with beige chinos',
  },
  mn13: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'lavender long-sleeve button-down shirt worn with beige chinos',
  },
  mn14: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'charcoal grey long-sleeve button-down shirt worn with beige chinos',
  },
  mn15: {
    src: `${BASE}/garment-linen-shirt-base.png`,
    category: 'upper_body',
    description: 'chocolate brown long-sleeve button-down shirt worn with beige chinos',
  },
  mn16: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'pale blue dress shirt tucked into charcoal grey trousers',
  },
  mn17: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'white dress shirt tucked into black tailored trousers',
  },
  fp1: {
    src: `${BASE}/garment-barong-base.png`,
    category: 'upper_body',
    description: 'classic Barong Tagalog, embroidered formal shirt worn untucked',
  },
  fp2: {
    src: `${BASE}/garment-terno-base.png`,
    category: 'dresses',
    description: 'Filipiniana terno dress with butterfly sleeves and a fitted bodice',
  },
  fp3: {
    src: `${BASE}/garment-filipiniana-blouse-base.png`,
    category: 'upper_body',
    description: 'barong-inspired women\'s blouse with a soft collar and light embroidery',
  },
  fp4: {
    src: `${BASE}/garment-terno-base.png`,
    category: 'dresses',
    description: 'modern Filipiniana dress with a clean silhouette and butterfly sleeves',
  },
  fp5: {
    src: `${BASE}/garment-terno-base.png`,
    category: 'dresses',
    description: 'terno-inspired dress with structured butterfly sleeves',
  },
  fp6: {
    src: `${BASE}/garment-filipiniana-blouse-base.png`,
    category: 'upper_body',
    description: 'modern Filipiniana blouse worn on the torso',
  },
  fp7: {
    src: `${BASE}/garment-terno-base.png`,
    category: 'dresses',
    description: 'woven-textile Filipiniana dress; selected PTRI textile is applied on the garment only',
  },
  fp8: {
    src: `${BASE}/garment-filipiniana-blouse-base.png`,
    category: 'upper_body',
    description: 'woven-textile Filipiniana blouse; selected PTRI textile is applied on the garment only',
  },
  fp9: {
    src: `${BASE}/garment-terno-base.png`,
    category: 'dresses',
    description: 'T\'nalak-inspired dress silhouette; T\'nalak textile is applied only when that textile is selected',
  },
  fp10: {
    src: `${BASE}/garment-filipiniana-blouse-base.png`,
    category: 'upper_body',
    description: 'T\'nalak-inspired blouse silhouette; T\'nalak textile is applied only when that textile is selected',
  },
  fp11: {
    src: `${BASE}/garment-terno-base.png`,
    category: 'dresses',
    description: 'piña-inspired Filipiniana dress; piña textile is applied only when that textile is selected',
  },
  fp12: {
    src: `${BASE}/garment-filipiniana-blouse-base.png`,
    category: 'upper_body',
    description: 'Inabel-inspired blouse; Inabel textile is applied only when that textile is selected',
  },
  fm1: {
    src: `${BASE}/garment-barong-base.png`,
    category: 'upper_body',
    description: 'modern Barong Tagalog with a cleaner embroidered front',
  },
  fm2: {
    src: `${BASE}/garment-barong-base.png`,
    category: 'upper_body',
    description: 'short-sleeve Barong Tagalog worn untucked',
  },
  fm3: {
    src: `${BASE}/garment-linen-shirt-base.png`,
    category: 'upper_body',
    description: 'woven Filipino shirt with an open collar',
  },
  fm4: {
    src: `${BASE}/garment-linen-shirt-base.png`,
    category: 'upper_body',
    description: 'T\'nalak-inspired men\'s shirt; T\'nalak textile is applied only when that textile is selected',
  },
  wf1: {
    src: `${BASE}/garment-lk4-dress.png`,
    category: 'dresses',
    description: 'formal midi dress with long sleeves and a flared skirt',
  },
  wf2: {
    src: `${BASE}/garment-lk4-dress.png`,
    category: 'dresses',
    description: 'office midi dress with a V-neck and knee-length skirt',
  },
  wf3: {
    src: `${BASE}/garment-collar-blouse-base.png`,
    category: 'upper_body',
    description: 'office blouse worn with a skirt, transferred as an upper-body garment',
  },
  wf4: {
    src: `${BASE}/garment-collar-blouse-base.png`,
    category: 'upper_body',
    description: 'office blouse worn with trousers',
  },
  wf5: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'tailored blazer outfit over a blouse',
  },
  wc1: {
    src: `${BASE}/garment-collar-blouse-base.png`,
    category: 'upper_body',
    description: 'casual women\'s blouse',
  },
  wc2: {
    src: `${BASE}/garment-linen-shirt-base.png`,
    category: 'upper_body',
    description: 'casual women\'s shirt',
  },
  wc3: {
    src: `${BASE}/garment-polo-base.png`,
    category: 'upper_body',
    description: 'polo-style top',
  },
  wc4: {
    src: `${BASE}/garment-collar-blouse-base.png`,
    category: 'upper_body',
    description: 'casual top worn with jeans',
  },
  wc5: {
    src: `${BASE}/garment-collar-blouse-base.png`,
    category: 'upper_body',
    description: 'casual blouse worn with trousers',
  },
  wc6: {
    src: `${BASE}/garment-lk4-dress.png`,
    category: 'dresses',
    description: 'casual day dress',
  },
  wc7: {
    src: `${BASE}/garment-collar-blouse-base.png`,
    category: 'upper_body',
    description: 'smart casual blouse and trousers',
  },
  mf1: {
    src: `${BASE}/garment-polo-base.png`,
    category: 'upper_body',
    description: 'long-sleeve polo shirt',
  },
  mf2: {
    src: `${BASE}/garment-polo-base.png`,
    category: 'upper_body',
    description: 'short-sleeve polo shirt',
  },
  mf3: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'dress shirt worn with trousers',
  },
  mf4: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'blazer and trousers over a dress shirt',
  },
  mf5: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'formal suit shirt and jacket',
  },
  mc1: {
    src: `${BASE}/garment-active-tee-base.png`,
    category: 'upper_body',
    description: 'casual T-shirt',
  },
  mc2: {
    src: `${BASE}/garment-polo-base.png`,
    category: 'upper_body',
    description: 'casual polo shirt',
  },
  mc3: {
    src: `${BASE}/garment-linen-shirt-base.png`,
    category: 'upper_body',
    description: 'casual button-down shirt',
  },
  mc4: {
    src: `${BASE}/garment-linen-shirt-base.png`,
    category: 'upper_body',
    description: 'casual shirt worn with jeans',
  },
  mc5: {
    src: `${BASE}/garment-polo-base.png`,
    category: 'upper_body',
    description: 'polo shirt worn with chinos',
  },
  mc6: {
    src: `${BASE}/garment-formal-shirt-base.png`,
    category: 'upper_body',
    description: 'smart casual shirt and trousers',
  },
};

/** Map each catalog design id → garment photo */
export const DESIGN_GARMENT: Record<string, GarmentKey> = {
  lk1: 'formal-shirt',
  lk2: 'collar-blouse',
  lk3: 'collar-blouse',
  lk4: 'terno',
  lk5: 'active-tee',
  wn1: 'formal-shirt',
  wn2: 'collar-blouse',
  wn3: 'formal-shirt',
  wn4: 'collar-blouse',
  wn5: 'formal-shirt',
  wn6: 'collar-blouse',
  wn7: 'formal-shirt',
  wn8: 'collar-blouse',
  wn9: 'terno',
  mn1: 'formal-shirt',
  mn2: 'formal-shirt',
  mn3: 'formal-shirt',
  mn4: 'linen-shirt',
  mn5: 'formal-shirt',
  mn6: 'formal-shirt',
  mn7: 'formal-shirt',
  mn8: 'formal-shirt',
  mn9: 'formal-shirt',
  mn10: 'linen-shirt',
  mn11: 'formal-shirt',
  mn12: 'formal-shirt',
  mn13: 'formal-shirt',
  mn14: 'formal-shirt',
  mn15: 'linen-shirt',
  mn16: 'formal-shirt',
  mn17: 'formal-shirt',
  fp1: 'barong',
  fp2: 'terno',
  fp3: 'filipiniana-blouse',
  fp4: 'terno',
  fp5: 'terno',
  fp6: 'filipiniana-blouse',
  fp7: 'terno',
  fp8: 'filipiniana-blouse',
  fp9: 'terno',
  fp10: 'filipiniana-blouse',
  fp11: 'terno',
  fp12: 'filipiniana-blouse',
  fm1: 'barong',
  fm2: 'barong',
  fm3: 'linen-shirt',
  fm4: 'linen-shirt',
  wf1: 'terno',
  wf2: 'terno',
  wf3: 'collar-blouse',
  wf4: 'collar-blouse',
  wf5: 'formal-shirt',
  wc1: 'collar-blouse',
  wc2: 'linen-shirt',
  wc3: 'polo',
  wc4: 'collar-blouse',
  wc5: 'collar-blouse',
  wc6: 'terno',
  wc7: 'collar-blouse',
  mf1: 'polo',
  mf2: 'polo',
  mf3: 'formal-shirt',
  mf4: 'formal-shirt',
  mf5: 'formal-shirt',
  mc1: 'active-tee',
  mc2: 'polo',
  mc3: 'linen-shirt',
  mc4: 'linen-shirt',
  mc5: 'polo',
  mc6: 'formal-shirt',
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
  tela: `${import.meta.env.BASE_URL}brand/tela-ui-bg.png`,
  studio: `${BG_BASE}/bg-studio.png`,
  office: `${BG_BASE}/bg-office.png`,
  living: `${BG_BASE}/bg-living.png`,
  outdoor: `${BG_BASE}/bg-outdoor.png`,
  lab: `${BG_BASE}/bg-lab.png`,
  travel: `${BG_BASE}/bg-travel.png`,
};
