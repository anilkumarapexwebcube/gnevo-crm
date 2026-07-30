'use server';

import { AiChatRequestSchema, type AiMessage } from '@gnevo/types';
import { apiServer } from '@/lib/session';

export interface ChatResult {
  ok: boolean;
  text?: string;
  error?: string;
}

export async function askAi(messages: AiMessage[]): Promise<ChatResult> {
  const parsed = AiChatRequestSchema.safeParse({ messages });
  if (!parsed.success) return { ok: false, error: 'Invalid message' };
  try {
    const res = await apiServer<{ text: string; provider: string }>('/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    return { ok: true, text: res.text };
  } catch (e) {
    const err = e as { status?: number; apiMessage?: string };
    if (err.status === 403) return { ok: false, error: 'You do not have permission to use AI.' };
    // Surface the real reason (invalid key / no credits / model unavailable).
    return { ok: false, error: err.apiMessage ?? 'AI request failed. Please try again.' };
  }
}
