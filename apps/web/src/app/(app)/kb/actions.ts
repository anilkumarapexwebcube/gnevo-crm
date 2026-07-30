'use server';

import { revalidatePath } from 'next/cache';
import { CreateArticleRequestSchema, UpdateArticleRequestSchema } from '@gnevo/types';
import { apiServer } from '@/lib/session';

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function errorMessage(e: unknown): string {
  const err = e as { status?: number; apiMessage?: string };
  if (err.status === 403) return 'You do not have permission to do that.';
  return err.apiMessage ?? 'Something went wrong. Please try again.';
}

export async function createArticle(input: unknown): Promise<ActionResult> {
  const parsed = CreateArticleRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  try {
    const created = await apiServer<{ id: string }>('/v1/kb', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    revalidatePath('/kb');
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function updateArticle(id: string, input: unknown): Promise<ActionResult> {
  const parsed = UpdateArticleRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  try {
    await apiServer(`/v1/kb/${id}`, { method: 'PATCH', body: JSON.stringify(parsed.data) });
    revalidatePath('/kb');
    revalidatePath(`/kb/${id}`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteArticle(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/kb/${id}`, { method: 'DELETE' });
    revalidatePath('/kb');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
