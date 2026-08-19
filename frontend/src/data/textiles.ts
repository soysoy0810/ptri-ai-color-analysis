const BASE = `${import.meta.env.BASE_URL}textiles`;

export type TextileId =
  | 'pina'
  | 'inabel'
  | 'tnalak'
  | 'yakan'
  | 'hablon'
  | 'abaca'
  | 'sinamay'
  | 'jusi'
  | 'silk-print';

export interface TextileSwatch {
  id: TextileId;
  name: string;
  hex: string;
  src: string;
}

/** Macro photos of Philippine textiles — used on the fabric grid and as scarf cloth. */
export const TEXTILES: TextileSwatch[] = [
  { id: 'pina', name: 'Piña', hex: '#2A2A2A', src: `${BASE}/textile-pina.jpg` },
  { id: 'inabel', name: 'Inabel', hex: '#1E3A5F', src: `${BASE}/textile-inabel.jpg` },
  { id: 'tnalak', name: "T'nalak", hex: '#5B3A29', src: `${BASE}/textile-tnalak.jpg` },
  { id: 'yakan', name: 'Yakan', hex: '#8B1E2D', src: `${BASE}/textile-yakan.jpg` },
  { id: 'hablon', name: 'Hablon', hex: '#4A4A4A', src: `${BASE}/textile-hablon.jpg` },
  { id: 'abaca', name: 'Abaca', hex: '#C8A165', src: `${BASE}/textile-abaca.jpg` },
  { id: 'sinamay', name: 'Sinamay', hex: '#D9B98B', src: `${BASE}/textile-sinamay.jpg` },
  { id: 'jusi', name: 'Jusi', hex: '#E8D5A3', src: `${BASE}/textile-jusi.jpg` },
];

export const TEXTILE_SRC: Record<TextileId, string> = {
  pina: `${BASE}/textile-pina.jpg`,
  inabel: `${BASE}/textile-inabel.jpg`,
  tnalak: `${BASE}/textile-tnalak.jpg`,
  yakan: `${BASE}/textile-yakan.jpg`,
  hablon: `${BASE}/textile-hablon.jpg`,
  abaca: `${BASE}/textile-abaca.jpg`,
  sinamay: `${BASE}/textile-sinamay.jpg`,
  jusi: `${BASE}/textile-jusi.jpg`,
  'silk-print': `${BASE}/textile-silk-print.jpg`,
};

export function textileSrc(id: TextileId | undefined | null): string | null {
  if (!id) return null;
  return TEXTILE_SRC[id] || null;
}
