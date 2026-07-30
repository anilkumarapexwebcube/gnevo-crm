'use server';

import { revalidatePath } from 'next/cache';
import { CreateDealRequestSchema } from '@gnevo/types';
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

export async function createDeal(input: unknown): Promise<ActionResult> {
  const parsed = CreateDealRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  try {
    await apiServer('/v1/deals', { method: 'POST', body: JSON.stringify(parsed.data) });
    revalidatePath('/deals');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function moveDeal(id: string, stageId: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/deals/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ stageId }),
    });
    revalidatePath('/deals');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteDeal(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/deals/${id}`, { method: 'DELETE' });
    revalidatePath('/deals');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
