import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface CreateMilestoneInput {
  projectId: string;
  title: string;
  dueDate?: string;
}

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, projectId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.milestone.findMany({
      where: { projectId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(organizationId: string, dto: CreateMilestoneInput) {
    const db = this.prisma.forTenant(organizationId);
    const project = await db.project.findFirst({ where: { id: dto.projectId, deletedAt: null } });
    if (!project) throw new NotFoundException('Project not found');
    return db.milestone.create({
      data: {
        organizationId,
        projectId: dto.projectId,
        title: dto.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
  }

  async toggle(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const m = await db.milestone.findFirst({ where: { id } });
    if (!m) throw new NotFoundException('Milestone not found');
    return db.milestone.update({
      where: { id },
      data: { status: m.status === 'done' ? 'open' : 'done' },
    });
  }

  async remove(organizationId: string, id: string): Promise<{ ok: true }> {
    const db = this.prisma.forTenant(organizationId);
    const m = await db.milestone.findFirst({ where: { id }, select: { id: true } });
    if (!m) throw new NotFoundException('Milestone not found');
    await db.milestone.delete({ where: { id } });
    return { ok: true };
  }
}
