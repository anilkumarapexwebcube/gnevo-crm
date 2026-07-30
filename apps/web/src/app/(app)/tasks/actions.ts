'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/session';

export interface TaskFull {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  projectId: string | null;
  parentId: string | null;
  assigneeId: string | null;
  startDate: string | null;
  dueDate: string | null;
  blockedBy: string[];
  project: { id: string; name: string } | null;
  assignee: { id: string; fullName: string } | null;
}

interface Result {
  ok: boolean;
  error?: string;
}

export async function listTasksAction(): Promise<TaskFull[]> {
  try {
    return await apiServer<TaskFull[]>('/v1/projects/tasks/all');
  } catch {
    return [];
  }
}

export async function createTaskFull(input: {
  projectId: string;
  title: string;
  parentId?: string;
  priority?: string;
  assigneeId?: string;
  startDate?: string;
  dueDate?: string;
  blockedBy?: string[];
}): Promise<Result> {
  try {
    await apiServer('/v1/projects/tasks', { method: 'POST', body: JSON.stringify(input) });
    revalidatePath('/tasks');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not create task' };
  }
}

export async function updateTaskFull(
  id: string,
  patch: {
    title?: string;
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    startDate?: string | null;
    dueDate?: string | null;
    blockedBy?: string[];
  },
): Promise<Result> {
  try {
    await apiServer(`/v1/projects/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    revalidatePath('/tasks');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not update task' };
  }
}

export async function deleteTaskFull(id: string): Promise<Result> {
  try {
    await apiServer(`/v1/projects/tasks/${id}`, { method: 'DELETE' });
    revalidatePath('/tasks');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not delete task' };
  }
}
