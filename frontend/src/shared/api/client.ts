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
  lighting?: { mean_luma: number; contrast: number; status: string };
  sample_rgb?: { r: number; g: number; b: number };
  top20?: PaletteColor[];
  model?: { name: string; version: string };
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
      }),
    }),

  analyze: (sessionId: string, imageBase64: string) =>
    request<AnalyzeResponse>('/analyze', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, image: imageBase64 }),
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
