'use server';

import { apiServer } from '@/lib/session';

export interface Macro {
  id: string;
  title: string;
  body: string;
  category: string;
  position: number;
  usageCount: number;
  lastUsedAt: string | null;
}

export async function listMacros(q?: string, category?: string): Promise<Macro[]> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category && category !== 'all') params.set('category', category);
  try {
    return await apiServer<Macro[]>(`/v1/macros?${params.toString()}`);
  } catch {
    return [];
  }
}

export async function createMacro(input: {
  title: string;
  body: string;
  category?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiServer('/v1/macros', { method: 'POST', body: JSON.stringify(input) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not create' };
  }
}

export async function updateMacro(
  id: string,
  patch: { title?: string; body?: string; category?: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiServer(`/v1/macros/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not save' };
  }
}

export async function deleteMacro(id: string): Promise<{ ok: boolean }> {
  try {
    await apiServer(`/v1/macros/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function duplicateMacro(id: string): Promise<{ ok: boolean }> {
  try {
    await apiServer(`/v1/macros/${id}/duplicate`, { method: 'POST' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function reorderMacro(id: string, direction: 'up' | 'down'): Promise<{ ok: boolean }> {
  try {
    await apiServer(`/v1/macros/${id}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function useMacro(id: string): Promise<void> {
  try {
    await apiServer(`/v1/macros/${id}/use`, { method: 'POST' });
  } catch {
    /* best-effort */
  }
}
