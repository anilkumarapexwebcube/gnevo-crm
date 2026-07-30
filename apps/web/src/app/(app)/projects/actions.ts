'use server';

import { revalidatePath } from 'next/cache';
import { CreateProjectRequestSchema, CreateTaskRequestSchema } from '@gnevo/types';
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

export async function summarizeProject(
  id: string,
): Promise<{ ok: boolean; summary?: string; error?: string }> {
  try {
    const res = await apiServer<{ summary: string }>(`/v1/projects/${id}/summary`, { method: 'POST' });
    return { ok: true, summary: res.summary };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? errorMessage(e) };
  }
}

export async function createProject(input: unknown): Promise<ActionResult> {
  const parsed = CreateProjectRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  try {
    await apiServer('/v1/projects', { method: 'POST', body: JSON.stringify(parsed.data) });
    revalidatePath('/projects');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/projects/${id}`, { method: 'DELETE' });
    revalidatePath('/projects');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function createTask(input: unknown): Promise<ActionResult> {
  const parsed = CreateTaskRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  try {
    await apiServer('/v1/projects/tasks', { method: 'POST', body: JSON.stringify(parsed.data) });
    revalidatePath(`/projects/${parsed.data.projectId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function updateTaskStatus(
  taskId: string,
  projectId: string,
  status: string,
): Promise<ActionResult> {
  try {
    await apiServer(`/v1/projects/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/tasks');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteTask(taskId: string, projectId: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/projects/tasks/${taskId}`, { method: 'DELETE' });
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
