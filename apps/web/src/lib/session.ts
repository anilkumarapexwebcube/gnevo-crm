import { cookies } from 'next/headers';
import type { AuthUser } from '@gnevo/types';
import { ACCESS_COOKIE } from './auth-constants';

export { ACCESS_COOKIE };

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Read the access token from the request cookies (server-side only). */
export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

/** Call the NestJS API from a server component/route with the bearer attached. */
export async function apiServer<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      title?: string;
      detail?: string;
      message?: string;
    };
    const message = body.detail ?? body.message ?? body.title;
    throw Object.assign(new Error(`API ${res.status}`), { status: res.status, apiMessage: message });
  }
  return res.json() as Promise<T>;
}

/** The authenticated user, or null if not signed in / token invalid. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!(await getAccessToken())) return null;
  try {
    return await apiServer<AuthUser>('/v1/auth/me');
  } catch {
    return null;
  }
}
