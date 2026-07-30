'use server';

import { apiServer } from '@/lib/session';

export interface ChatChannel {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  isDm: boolean;
  memberCount: number;
  messageCount: number;
  unread: number;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface ChannelThread {
  channel: { id: string; name: string; isDm: boolean; isPrivate: boolean };
  messages: ChatMessage[];
}

export async function listChannels(): Promise<ChatChannel[]> {
  try {
    return await apiServer<ChatChannel[]>('/v1/chat/channels');
  } catch {
    return [];
  }
}

export async function createChannel(input: {
  name: string;
  description?: string;
  isPrivate?: boolean;
  memberIds?: string[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await apiServer<{ id: string }>('/v1/chat/channels', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return { ok: true, id: res.id };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not create channel' };
  }
}

export async function openDm(userId: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await apiServer<{ id: string }>('/v1/chat/dm', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return { ok: true, id: res.id };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not open DM' };
  }
}

export async function getThread(channelId: string, before?: string): Promise<ChannelThread | null> {
  try {
    const qs = before ? `?before=${encodeURIComponent(before)}` : '';
    return await apiServer<ChannelThread>(`/v1/chat/channels/${channelId}/messages${qs}`);
  } catch {
    return null;
  }
}

export async function sendMessage(
  channelId: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiServer(`/v1/chat/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not send' };
  }
}

export async function markChannelRead(channelId: string): Promise<{ ok: boolean }> {
  try {
    await apiServer(`/v1/chat/channels/${channelId}/read`, { method: 'POST' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
