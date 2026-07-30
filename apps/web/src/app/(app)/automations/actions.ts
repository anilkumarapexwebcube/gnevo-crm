'use server';

import { revalidatePath } from 'next/cache';
import { CreateAutomationRequestSchema } from '@gnevo/types';
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

export async function createAutomation(input: unknown): Promise<ActionResult> {
  const parsed = CreateAutomationRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  try {
    await apiServer('/v1/automations', { method: 'POST', body: JSON.stringify(parsed.data) });
    revalidatePath('/automations');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function toggleAutomation(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await apiServer(`/v1/automations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    revalidatePath('/automations');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteAutomation(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/automations/${id}`, { method: 'DELETE' });
    revalidatePath('/automations');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
