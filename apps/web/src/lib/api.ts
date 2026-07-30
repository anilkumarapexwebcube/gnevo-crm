import { type AuthTokens, type AuthUser, LoginRequestSchema } from '@gnevo/types';

const API_BASE = '/api/v1';

export interface ApiError {
  title: string;
  status: number;
  detail?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    throw body as ApiError;
  }
  return body as T;
}

export const api = {
  login(email: string, password: string, organizationSlug?: string) {
    const payload = LoginRequestSchema.parse({ email, password, organizationSlug });
    return request<{ user: AuthUser; tokens: AuthTokens }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  me(accessToken: string) {
    return request<AuthUser>('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
