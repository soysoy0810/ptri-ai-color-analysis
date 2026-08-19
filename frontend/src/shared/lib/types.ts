/** Kiosk flow — camera guide, lighting and scan are merged into one auto-detect step. */
export type StepId =
  | 'welcome'
  | 'profile'
  | 'cameraGuide'
  | 'skinTone'
  | 'analysis'
  | 'top20'
  | 'chooseTop'
  | 'colorPreview'
  | 'category'
  | 'design'
  | 'fabric'
  | 'accessories'
  | 'background'
  | 'preview'
  | 'recommendation'
  | 'results'
  | 'thanks';

export type SelectionMode = 'top5' | 'top10' | 'custom';

export type LightingStatus = 'good' | 'fair' | 'poor' | 'checking';

export interface Profile {
  fullName: string;
  ageRange: string;
  gender: string;
  email: string;
  purpose: string;
}

export interface PaletteColor {
  id: string;
  name: string;
  hex: string;
  sort_order?: number;
  score?: number;
  delta_e?: number;
  reason?: string;
  factors?: {
    undertone_harmony?: number;
    lightness_contrast?: number;
    chroma_fit?: number;
    washout_penalty?: number;
  };
}

export interface FabricItem {
  id: string;
  code: string;
  name: string;
  hex: string;
  base_match?: number;
  match?: number;
}

export interface CategoryItem {
  id: string;
  label: string;
  description: string;
  sort_order?: number;
}

export interface DesignItem {
  id: string;
  name: string;
  style: string;
  category_id: string;
  /** Who the garment is designed for: 'male' | 'female' | 'unisex' */
  audience?: string;
  /** Try-on compositor preset (polo, barong, etc.) */
  garment_type?: string;
  /** Admin-uploaded catalog photo */
  preview_url?: string | null;
  /** Admin-uploaded try-on overlay/base PNG */
  tryon_url?: string | null;
}

export interface BackgroundItem {
  id: string;
  label: string;
  tone: string;
  sort_order?: number;
}

export interface LightingInfo {
  mean_luma: number;
  contrast: number;
  status: LightingStatus;
}

/** Normalized (0..1) face bounding box within the captured frame */
export interface FaceRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Normalized MediaPipe face landmark [x, y] each 0..1 */
export type FaceLandmark = [number, number];

export type PortraitLighting = 'warm' | 'neutral' | 'cool';

export interface SessionState {
  step: StepId;
  sessionId: string | null;
  profile: Profile;
  captureDataUrl: string | null;
  faceBox: FaceRegion | null;
  faceLandmarks: FaceLandmark[] | null;
  captureWidth: number | null;
  captureHeight: number | null;
  portraitLighting: PortraitLighting;
  lighting: LightingInfo | null;
  top20: PaletteColor[];
  selectionMode: SelectionMode;
  selectedColors: PaletteColor[];
  categoryId: string | null;
  designId: string | null;
  backgroundId: string;
  fabricId: string | null;
  fabricMatches: FabricItem[];
  selectedAccessories: string[];
  staffAlerted: boolean;
  resultToken: string | null;
}

export interface SessionSummary {
  name: string;
  categoryId: string | null;
  designId: string | null;
  fabric: FabricItem | undefined;
  colors: PaletteColor[];
  backgroundId: string;
}

export type SessionAction =
  | { type: 'SET_STEP'; step: StepId }
  | { type: 'SET_PROFILE'; profile: Partial<Profile> }
  | { type: 'SET_SESSION'; sessionId: string }
  | {
      type: 'SET_CAPTURE';
      dataUrl: string;
      faceBox: FaceRegion | null;
      faceLandmarks?: FaceLandmark[] | null;
      width?: number;
      height?: number;
    }
  | { type: 'SET_PORTRAIT_LIGHTING'; lighting: PortraitLighting }
  | { type: 'SET_LIGHTING'; lighting: LightingInfo }
  | { type: 'SET_TOP20'; top20: PaletteColor[] }
  | { type: 'SET_SELECTION_MODE'; mode: SelectionMode }
  | { type: 'SET_SELECTED_COLORS'; colors: PaletteColor[] }
  | { type: 'SET_CATEGORY'; categoryId: string }
  | { type: 'SET_DESIGN'; designId: string }
  | { type: 'SET_BACKGROUND'; backgroundId: string }
  | { type: 'SET_FABRIC'; fabricId: string }
  | { type: 'TOGGLE_ACCESSORY'; accessory: string }
  | { type: 'SET_RESULT_TOKEN'; token: string }
  | { type: 'STAFF_ALERT' }
  | { type: 'RESET' };
