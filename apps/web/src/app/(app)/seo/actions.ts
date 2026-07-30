'use server';

import { revalidatePath } from 'next/cache';
import { CreateKeywordRequestSchema, CreateSeoProjectRequestSchema } from '@gnevo/types';
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

export async function createSeoProject(input: unknown): Promise<ActionResult> {
  const parsed = CreateSeoProjectRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  try {
    await apiServer('/v1/seo/projects', { method: 'POST', body: JSON.stringify(parsed.data) });
    revalidatePath('/seo');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteSeoProject(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/seo/projects/${id}`, { method: 'DELETE' });
    revalidatePath('/seo');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function addKeyword(input: unknown): Promise<ActionResult> {
  const parsed = CreateKeywordRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  try {
    await apiServer('/v1/seo/keywords', { method: 'POST', body: JSON.stringify(parsed.data) });
    revalidatePath(`/seo/${parsed.data.seoProjectId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteKeyword(id: string, seoProjectId: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/seo/keywords/${id}`, { method: 'DELETE' });
    revalidatePath(`/seo/${seoProjectId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function connectGsc(
  id: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const res = await apiServer<{ url: string }>(`/v1/seo/projects/${id}/connect`);
    return { ok: true, url: res.url };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function syncGsc(
  id: string,
): Promise<{ ok: boolean; synced?: number; error?: string }> {
  try {
    const res = await apiServer<{ synced: number }>(`/v1/seo/projects/${id}/sync`, {
      method: 'POST',
    });
    revalidatePath(`/seo/${id}`);
    return { ok: true, synced: res.synced };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function snapshotKeywords(
  projectId: string,
): Promise<{ ok: boolean; captured?: number; error?: string }> {
  try {
    const res = await apiServer<{ captured: number }>('/v1/seo/keywords/snapshot', {
      method: 'POST',
    });
    revalidatePath(`/seo/${projectId}`);
    return { ok: true, captured: res.captured };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export interface KeywordHistoryPoint {
  position: number | null;
  clicks: number;
  impressions: number;
  capturedAt: string;
}

export async function getKeywordHistory(id: string): Promise<KeywordHistoryPoint[]> {
  try {
    return await apiServer<KeywordHistoryPoint[]>(`/v1/seo/keywords/${id}/history`);
  } catch {
    return [];
  }
}

export interface Competitor {
  id: string;
  name: string;
  url: string;
  notes: string | null;
}

export async function listCompetitors(projectId: string): Promise<Competitor[]> {
  try {
    return await apiServer<Competitor[]>(`/v1/seo/competitors?projectId=${projectId}`);
  } catch {
    return [];
  }
}

export async function addCompetitor(input: {
  seoProjectId: string;
  name: string;
  url: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    await apiServer('/v1/seo/competitors', { method: 'POST', body: JSON.stringify(input) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteCompetitor(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/seo/competitors/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export interface AuditReport {
  url: string;
  status: number;
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  h1s: string[];
  canonical: string;
  robots: string;
  wordCount: number;
  imageCount: number;
  imagesMissingAlt: number;
  linkCount: number;
  issues: string[];
}

export async function runAudit(
  url: string,
): Promise<{ ok: boolean; report?: AuditReport; error?: string }> {
  try {
    const report = await apiServer<AuditReport>('/v1/seo/audit', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    return { ok: true, report };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Audit failed' };
  }
}
