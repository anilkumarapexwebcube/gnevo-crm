'use server';

import { revalidatePath } from 'next/cache';
import { CreateAnnouncementRequestSchema } from '@gnevo/types';
import { apiServer } from '@/lib/session';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function errorMessage(e: unknown): string {
  const err = e as { status?: number; apiMessage?: string };
  if (err.status === 403) return 'You do not have permission to do that.';
  return err.apiMessage ?? 'Something went wrong. Please try again.';
}

export async function createAnnouncement(input: unknown): Promise<ActionResult> {
  const parsed = CreateAnnouncementRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  try {
    await apiServer('/v1/announcements', { method: 'POST', body: JSON.stringify(parsed.data) });
    revalidatePath('/announcements');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/announcements/${id}`, { method: 'DELETE' });
    revalidatePath('/announcements');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
