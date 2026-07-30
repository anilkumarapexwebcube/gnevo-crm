import { cookies } from 'next/headers';
import { PORTAL_COOKIE } from './auth-constants';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Read the client-portal token from cookies (server-side only). */
export async function getPortalToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(PORTAL_COOKIE)?.value ?? null;
}

/** Call the NestJS API with the client-portal bearer attached. */
export async function portalApiServer<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getPortalToken();
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
    const body = (await res.json().catch(() => ({}))) as { detail?: string; message?: string };
    throw Object.assign(new Error(`API ${res.status}`), {
      status: res.status,
      apiMessage: body.detail ?? body.message,
    });
  }
  return res.json() as Promise<T>;
}
