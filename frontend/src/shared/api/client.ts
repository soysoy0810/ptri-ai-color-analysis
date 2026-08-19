import type { PaletteColor, Profile } from '../lib/types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');

interface ApiErrorBody {
  ok?: boolean;
  error?: { code?: string; message?: string };
  message?: string;
  data?: unknown;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = (await res.json().catch(() => ({}))) as ApiErrorBody;

  if (!res.ok || payload.ok === false) {
    const message =
      payload?.error?.message || payload.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return (payload.data !== undefined ? payload.data : payload) as T;
}

export interface AnalyzeResponse {
  session_id?: string;
  face_detected?: boolean;
  face_region?: { left: number; top: number; right: number; bottom: number; confidence: number; provider: string } | null;
  lighting?: { mean_luma: number; contrast: number; status: string };
  sample_rgb?: { r: number; g: number; b: number };
  /** Real per-region medians (forehead/left_cheek/right_cheek/nose_bridge/chin) — the 5 real candidate skin tones */
  skin_regions?: Record<string, { r: number; g: number; b: number }>;
  skin_profile?: {
    undertone?: string;
    depth?: string;
    ita?: number;
    confidence?: number;
    chroma?: number;
    message?: string | null;
    lab?: { L: number; a: number; b: number };
    frames_used?: number;
  };
  top20?: PaletteColor[];
  model?: { name: string; version: string };
}

export interface SegmentResponse {
  segmented: boolean;
  /** Grayscale alpha mask as a base64 PNG data URL */
  mask?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface TryOnResponse {
  ok: boolean;
  /** Generated image (person actually wearing the garment) as a base64 data URL */
  image?: string | null;
  status: string;
  message?: string;
  provider?: string;
  diagnostics?: {
    model?: string | null;
    generated_by?: string | null;
    composited?: boolean;
    unsupported_inputs?: string[];
    capabilities?: Record<string, unknown>;
  };
}

export interface TryOnRequest {
  personImage: string;
  garmentImage: string;
  category: string;
  description: string;
  fabricHex?: string;
  textileName?: string;
  textileImage?: string;
  accessories?: string[];
  backgroundId?: string;
  view?: string;
  lighting?: string;
}

export interface TryOnRuntime {
  provider?: string;
  torch_installed?: boolean;
  cuda_available?: boolean;
  mps_available?: boolean;
  device?: string | null;
  space?: string;
  authenticated?: boolean;
  gradio_client_installed?: boolean;
  server_reachable?: boolean;
  reason?: string;
}

export interface CreateSessionResponse {
  session_id: string;
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  getCatalog: () => request<Record<string, unknown>>('/catalog'),

  createSession: (profile: Profile) =>
    request<CreateSessionResponse>('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        full_name: profile.fullName,
        age_range: profile.ageRange,
        gender: profile.gender,
        email: profile.email || '',
        purpose: profile.purpose || '',
      }),
    }),

  analyze: (sessionId: string, imageBase64: string, images?: string[]) =>
    request<AnalyzeResponse>('/analyze', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        image: imageBase64,
        images: images?.length ? images : undefined,
      }),
    }),

  segment: (imageBase64: string) =>
    request<SegmentResponse>('/segment', {
      method: 'POST',
      body: JSON.stringify({ image: imageBase64 }),
    }),

  tryonRuntime: () => request<TryOnRuntime>('/tryon/runtime'),

  tryon: (req: TryOnRequest) =>
    request<TryOnResponse>('/tryon', {
      method: 'POST',
        signal: AbortSignal.timeout(125000),
      body: JSON.stringify({
        person_image: req.personImage,
        garment_image: req.garmentImage,
        category: req.category,
        garment_description: req.description,
        fabric_hex: req.fabricHex || undefined,
        textile_name: req.textileName || undefined,
        textile_image: req.textileImage || undefined,
        accessories: req.accessories || [],
        background_id: req.backgroundId || undefined,
        view: req.view || undefined,
        lighting: req.lighting || undefined,
      }),
    }),

  completeSession: (sessionId: string, payload: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sendEmail: (sessionId: string, email: string) =>
    request<Record<string, unknown>>(`/sessions/${sessionId}/email`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  callStaff: (sessionId: string | null) =>
    request<Record<string, unknown>>('/staff-alerts', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    }),
};
