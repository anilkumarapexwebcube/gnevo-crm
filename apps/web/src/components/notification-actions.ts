'use server';

import { apiServer } from '@/lib/session';

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  type: string;
  readAt: string | null;
  createdAt: string;
}

export async function fetchNotifications(): Promise<{ items: NotificationItem[]; unread: number }> {
  try {
    const [items, count] = await Promise.all([
      apiServer<NotificationItem[]>('/v1/notifications'),
      apiServer<{ count: number }>('/v1/notifications/unread-count'),
    ]);
    return { items, unread: count.count };
  } catch {
    return { items: [], unread: 0 };
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await apiServer(`/v1/notifications/${id}/read`, { method: 'POST' });
  } catch {
    /* ignore */
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await apiServer('/v1/notifications/read-all', { method: 'POST' });
  } catch {
    /* ignore */
  }
}
