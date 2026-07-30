import { Injectable } from '@nestjs/common';
import type { Prisma } from '@gnevo/db';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface AuditInput {
  actorId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Write an immutable audit record. Best-effort — never breaks the caller. */
  async record(organizationId: string, input: AuditInput): Promise<void> {
    try {
      const db = this.prisma.forTenant(organizationId);
      await db.auditLog.create({
        data: {
          organizationId,
          actorId: input.actorId ?? null,
          action: input.action,
          resource: input.resource ?? null,
          resourceId: input.resourceId ?? null,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          ...(input.before !== undefined ? { before: input.before } : {}),
          ...(input.after !== undefined ? { after: input.after } : {}),
        },
      });
    } catch {
      /* swallow — auditing must not break the primary action */
    }
  }

  async list(organizationId: string, limit = 100) {
    const db = this.prisma.forTenant(organizationId);
    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
    // actorId is a bare column (no relation) — resolve names in one extra query.
    const actorIds = [...new Set(logs.map((l) => l.actorId).filter((v): v is string => !!v))];
    const users = actorIds.length
      ? await db.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.fullName || u.email]));
    return logs.map((l) => ({
      ...l,
      actorName: l.actorId ? (nameById.get(l.actorId) ?? null) : null,
    }));
  }
}
