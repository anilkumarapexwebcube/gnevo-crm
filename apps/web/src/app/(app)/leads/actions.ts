'use server';

import { revalidatePath } from 'next/cache';
import { CreateLeadRequestSchema } from '@gnevo/types';
import { apiServer } from '@/lib/session';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function errorMessage(e: unknown): string {
  const status = (e as { status?: number })?.status;
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 401) return 'Your session expired. Please sign in again.';
  return 'Something went wrong. Please try again.';
}

export async function createLead(input: unknown): Promise<ActionResult> {
  const parsed = CreateLeadRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  try {
    await apiServer('/v1/leads', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    revalidatePath('/leads');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteLead(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/leads/${id}`, { method: 'DELETE' });
    revalidatePath('/leads');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function scoreLead(
  id: string,
): Promise<{ ok: boolean; score?: number; error?: string }> {
  try {
    const res = await apiServer<{ score: number }>(`/v1/leads/${id}/score`, { method: 'POST' });
    revalidatePath(`/leads/${id}`);
    revalidatePath('/leads');
    return { ok: true, score: res.score };
  } catch (e) {
    const err = e as { status?: number; apiMessage?: string };
    return { ok: false, error: err.apiMessage ?? 'Scoring failed' };
  }
}

export interface SavedView {
  id: string;
  name: string;
  query: Record<string, string>;
}

export async function getLeadViews(): Promise<SavedView[]> {
  try {
    return await apiServer<SavedView[]>('/v1/org/saved-views?entity=leads');
  } catch {
    return [];
  }
}

export async function saveLeadView(
  name: string,
  query: Record<string, string>,
): Promise<ActionResult> {
  try {
    await apiServer('/v1/org/saved-views', {
      method: 'POST',
      body: JSON.stringify({ entity: 'leads', name, query }),
    });
    revalidatePath('/leads');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteLeadView(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/org/saved-views/leads/${id}`, { method: 'DELETE' });
    revalidatePath('/leads');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function convertLead(
  id: string,
): Promise<{ ok: boolean; customerId?: string; error?: string }> {
  try {
    const res = await apiServer<{ customerId: string }>(`/v1/leads/${id}/convert`, {
      method: 'POST',
    });
    revalidatePath('/leads');
    revalidatePath('/customers');
    return { ok: true, customerId: res.customerId };
  } catch (e) {
    const err = e as { apiMessage?: string };
    return { ok: false, error: err.apiMessage ?? 'Could not convert lead' };
  }
}
