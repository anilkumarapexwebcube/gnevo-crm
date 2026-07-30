import { Injectable } from '@nestjs/common';
import type { Prisma } from '@gnevo/db';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface LogActivityInput {
  actorUserId?: string;
  actorName?: string;
  verb: string;
  entityType: string;
  entityId?: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Record an activity event. Best-effort — never breaks the caller. */
  async log(organizationId: string, input: LogActivityInput): Promise<void> {
    try {
      const db = this.prisma.forTenant(organizationId);
      await db.activity.create({
        data: {
          organizationId,
          actorUserId: input.actorUserId ?? null,
          actorName: input.actorName ?? null,
          verb: input.verb,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          summary: input.summary,
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        },
      });
    } catch {
      /* swallow — activity logging is non-critical */
    }
  }

  async list(
    organizationId: string,
    opts: { entityType?: string; entityId?: string; limit?: number },
  ) {
    const db = this.prisma.forTenant(organizationId);
    return db.activity.findMany({
      where: {
        ...(opts.entityType ? { entityType: opts.entityType } : {}),
        ...(opts.entityId ? { entityId: opts.entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(opts.limit ?? 50, 100),
    });
  }
}
