import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface LogTimeInput {
  projectId?: string;
  taskId?: string;
  minutes: number;
  note?: string;
  spentAt?: string;
}

@Injectable()
export class TimeService {
  constructor(private readonly prisma: PrismaService) {}

  async log(organizationId: string, user: { id: string; name?: string }, dto: LogTimeInput) {
    const db = this.prisma.forTenant(organizationId);
    return db.timeEntry.create({
      data: {
        organizationId,
        userId: user.id,
        userName: user.name || null,
        projectId: dto.projectId ?? null,
        taskId: dto.taskId ?? null,
        minutes: dto.minutes,
        note: dto.note ?? null,
        spentAt: dto.spentAt ? new Date(dto.spentAt) : new Date(),
      },
    });
  }

  async list(organizationId: string, projectId?: string) {
    const db = this.prisma.forTenant(organizationId);
    const entries = await db.timeEntry.findMany({
      where: { ...(projectId ? { projectId } : {}) },
      orderBy: { spentAt: 'desc' },
      take: 200,
    });
    const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
    return { entries, totalMinutes };
  }

  async remove(organizationId: string, id: string): Promise<{ ok: true }> {
    const db = this.prisma.forTenant(organizationId);
    const found = await db.timeEntry.findFirst({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('Time entry not found');
    await db.timeEntry.delete({ where: { id } });
    return { ok: true };
  }
}
