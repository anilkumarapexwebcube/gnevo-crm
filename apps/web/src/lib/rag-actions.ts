'use server';

import { apiServer } from '@/lib/session';

export interface RagResult {
  entityType: string;
  entityId: string;
  title: string;
  snippet: string;
  link: string;
  score: number;
}

export async function semanticSearch(
  q: string,
): Promise<{ ok: boolean; results: RagResult[]; indexed: number; error?: string }> {
  try {
    const res = await apiServer<{ results: RagResult[]; indexed: number }>(
      `/v1/rag/search?q=${encodeURIComponent(q)}`,
    );
    return { ok: true, results: res.results, indexed: res.indexed };
  } catch (e) {
    return { ok: false, results: [], indexed: 0, error: (e as { apiMessage?: string }).apiMessage ?? 'Search failed' };
  }
}

export async function ragStatus(): Promise<{ indexed: number; configured: boolean }> {
  try {
    return await apiServer<{ indexed: number; configured: boolean }>('/v1/rag/status');
  } catch {
    return { indexed: 0, configured: false };
  }
}

export async function reindexRag(): Promise<{ ok: boolean; indexed?: number; error?: string }> {
  try {
    const res = await apiServer<{ indexed: number }>('/v1/rag/reindex', { method: 'POST' });
    return { ok: true, indexed: res.indexed };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Reindex failed' };
  }
}
