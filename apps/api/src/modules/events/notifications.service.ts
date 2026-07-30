import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface NotifyInput {
  title: string;
  body?: string;
  link?: string;
  type?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an in-app notification for a user. Best-effort: a failure here must
   * never break the primary operation that triggered it.
   */
  async notify(organizationId: string, userId: string, input: NotifyInput): Promise<void> {
    if (!userId) return;
    try {
      const db = this.prisma.forTenant(organizationId);
      await db.notification.create({
        data: {
          organizationId,
          userId,
          title: input.title,
          body: input.body ?? null,
          link: input.link ?? null,
          type: input.type ?? 'info',
        },
      });
    } catch {
      /* swallow — notifications are non-critical */
    }
  }

  async list(organizationId: string, userId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async unreadCount(organizationId: string, userId: string): Promise<{ count: number }> {
    const db = this.prisma.forTenant(organizationId);
    const count = await db.notification.count({ where: { userId, readAt: null } });
    return { count };
  }

  async markRead(organizationId: string, userId: string, id: string): Promise<{ ok: true }> {
    const db = this.prisma.forTenant(organizationId);
    await db.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(organizationId: string, userId: string): Promise<{ ok: true }> {
    const db = this.prisma.forTenant(organizationId);
    await db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
