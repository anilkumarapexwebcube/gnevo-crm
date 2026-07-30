import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../events/notifications.service.js';
import { ActivityService } from '../events/activity.service.js';

export interface CreateNoteInput {
  entityType: string;
  entityId: string;
  kind?: string;
  body: string;
}

const ENTITY_LINK: Record<string, (id: string) => string> = {
  customer: (id) => `/customers/${id}`,
  lead: (id) => `/leads/${id}`,
  deal: () => `/deals`,
};

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
  ) {}

  async create(organizationId: string, authorId: string, dto: CreateNoteInput) {
    const db = this.prisma.forTenant(organizationId);
    const author = await db.user.findFirst({
      where: { id: authorId },
      select: { fullName: true, email: true },
    });
    const authorName = author?.fullName || author?.email || null;
    const kind = ['note', 'call', 'email', 'meeting'].includes(dto.kind ?? '')
      ? (dto.kind as string)
      : 'note';

    const note = await db.note.create({
      data: {
        organizationId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        authorId,
        authorName,
        kind,
        body: dto.body,
      },
    });

    await this.activity.log(organizationId, {
      actorUserId: authorId,
      actorName: authorName ?? undefined,
      verb: 'noted',
      entityType: dto.entityType,
      entityId: dto.entityId,
      summary: `${authorName ?? 'Someone'} logged a ${kind}`,
    });

    // @mentions → notify matched users (best-effort).
    await this.notifyMentions(organizationId, authorId, authorName, dto, note.id);
    return note;
  }

  private async notifyMentions(
    organizationId: string,
    authorId: string,
    authorName: string | null,
    dto: CreateNoteInput,
    _noteId: string,
  ): Promise<void> {
    const tokens = [...dto.body.matchAll(/@([a-zA-Z0-9._-]+)/g)].map((m) => m[1]!.toLowerCase());
    if (tokens.length === 0) return;
    const db = this.prisma.forTenant(organizationId);
    const users = await db.user.findMany({
      where: { deletedAt: null },
      select: { id: true, fullName: true, email: true },
    });
    const link = ENTITY_LINK[dto.entityType]?.(dto.entityId);
    const notified = new Set<string>();
    for (const u of users) {
      if (u.id === authorId || notified.has(u.id)) continue;
      const first = (u.fullName || '').split(' ')[0]?.toLowerCase() ?? '';
      const local = (u.email || '').split('@')[0]?.toLowerCase() ?? '';
      if (tokens.some((t) => t === first || t === local)) {
        notified.add(u.id);
        await this.notifications.notify(organizationId, u.id, {
          title: `${authorName ?? 'Someone'} mentioned you`,
          body: dto.body.slice(0, 120),
          link,
          type: 'mention',
        });
      }
    }
  }

  async list(organizationId: string, entityType: string, entityId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.note.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async remove(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const note = await db.note.findFirst({ where: { id }, select: { id: true } });
    if (!note) throw new NotFoundException('Note not found');
    await db.note.delete({ where: { id } });
    return { ok: true };
  }
}
