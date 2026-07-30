'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/session';

export interface Member {
  id: string;
  fullName: string;
  email: string;
}

export async function getMembers(): Promise<Member[]> {
  try {
    return await apiServer<Member[]>('/v1/org/members');
  } catch {
    return [];
  }
}

export async function setAccountManager(customerId: string, userId: string | null): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiServer(`/v1/customers/${customerId}/account-manager`, { method: 'POST', body: JSON.stringify({ userId }) });
    revalidatePath(`/customers/${customerId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not update account manager' };
  }
}

export interface ClientSnapshot {
  id: string;
  capturedAt: string;
  openDeals: number;
  openDealsValue: number;
  wonValue: number;
  paidRevenue: number;
  outstanding: number;
  openTickets: number;
  openProjects: number;
  healthScore: number;
}

export async function listSnapshots(customerId: string): Promise<ClientSnapshot[]> {
  try {
    return await apiServer<ClientSnapshot[]>(`/v1/customers/${customerId}/snapshots`);
  } catch {
    return [];
  }
}

export async function captureSnapshot(customerId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiServer(`/v1/customers/${customerId}/snapshot`, { method: 'POST' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not capture snapshot' };
  }
}

export interface NoteItem {
  id: string;
  kind: string;
  body: string;
  authorName: string | null;
  createdAt: string;
}

export async function listNotes(entityType: string, entityId: string): Promise<NoteItem[]> {
  try {
    return await apiServer<NoteItem[]>(
      `/v1/notes?entityType=${entityType}&entityId=${entityId}`,
    );
  } catch {
    return [];
  }
}

export async function addNote(input: {
  entityType: string;
  entityId: string;
  kind: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiServer('/v1/notes', { method: 'POST', body: JSON.stringify(input) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not save note' };
  }
}

export async function deleteNote(id: string): Promise<{ ok: boolean }> {
  try {
    await apiServer(`/v1/notes/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Update tags on a customer or lead. */
export async function setTags(
  entityType: 'customer' | 'lead',
  id: string,
  tags: string[],
): Promise<{ ok: boolean; error?: string }> {
  const path = entityType === 'customer' ? `/v1/customers/${id}` : `/v1/leads/${id}`;
  try {
    await apiServer(path, { method: 'PATCH', body: JSON.stringify({ tags }) });
    revalidatePath(`/${entityType}s/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not save tags' };
  }
}

export interface TimeEntry {
  id: string;
  userName: string | null;
  minutes: number;
  note: string | null;
  spentAt: string;
}

export async function listTime(
  projectId: string,
): Promise<{ entries: TimeEntry[]; totalMinutes: number }> {
  try {
    return await apiServer(`/v1/time?projectId=${projectId}`);
  } catch {
    return { entries: [], totalMinutes: 0 };
  }
}

export async function logTime(input: {
  projectId: string;
  minutes: number;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiServer('/v1/time', { method: 'POST', body: JSON.stringify(input) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not log time' };
  }
}

export async function deleteTime(id: string): Promise<{ ok: boolean }> {
  try {
    await apiServer(`/v1/time/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export interface ContentItem {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  notes: string | null;
}

export async function listContent(): Promise<ContentItem[]> {
  try {
    return await apiServer<ContentItem[]>('/v1/content');
  } catch {
    return [];
  }
}

export async function createContent(input: {
  title: string;
  dueDate?: string;
  notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiServer('/v1/content', { method: 'POST', body: JSON.stringify(input) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not add' };
  }
}

export async function updateContent(
  id: string,
  patch: { title?: string; status?: string; dueDate?: string | null; notes?: string },
): Promise<{ ok: boolean }> {
  try {
    await apiServer(`/v1/content/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deleteContent(id: string): Promise<{ ok: boolean }> {
  try {
    await apiServer(`/v1/content/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export interface Milestone {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
}

export async function listMilestones(projectId: string): Promise<Milestone[]> {
  try {
    return await apiServer<Milestone[]>(`/v1/milestones?projectId=${projectId}`);
  } catch {
    return [];
  }
}

export async function createMilestone(input: {
  projectId: string;
  title: string;
  dueDate?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiServer('/v1/milestones', { method: 'POST', body: JSON.stringify(input) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not add milestone' };
  }
}

export async function toggleMilestone(id: string): Promise<{ ok: boolean }> {
  try {
    await apiServer(`/v1/milestones/${id}/toggle`, { method: 'POST' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deleteMilestone(id: string): Promise<{ ok: boolean }> {
  try {
    await apiServer(`/v1/milestones/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function mergeLeads(input: {
  survivorId: string;
  losingId: string;
  data: Record<string, string | null>;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await apiServer<{ id: string }>('/v1/leads/merge', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/leads');
    revalidatePath('/leads/duplicates');
    return { ok: true, id: res.id };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Merge failed' };
  }
}
