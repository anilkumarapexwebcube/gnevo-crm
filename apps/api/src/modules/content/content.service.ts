import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

const STATUSES = ['idea', 'writing', 'review', 'published'];

export interface CreateContentInput {
  title: string;
  dueDate?: string;
  notes?: string;
}

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.contentItem.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
  }

  async create(organizationId: string, dto: CreateContentInput) {
    const db = this.prisma.forTenant(organizationId);
    return db.contentItem.create({
      data: {
        organizationId,
        title: dto.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes ?? null,
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    dto: { title?: string; status?: string; dueDate?: string | null; notes?: string },
  ) {
    const db = this.prisma.forTenant(organizationId);
    const item = await db.contentItem.findFirst({ where: { id } });
    if (!item) throw new NotFoundException('Content item not found');
    const status = dto.status && STATUSES.includes(dto.status) ? dto.status : undefined;
    return db.contentItem.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(status ? { status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
      },
    });
  }

  async remove(organizationId: string, id: string): Promise<{ ok: true }> {
    const db = this.prisma.forTenant(organizationId);
    const item = await db.contentItem.findFirst({ where: { id }, select: { id: true } });
    if (!item) throw new NotFoundException('Content item not found');
    await db.contentItem.delete({ where: { id } });
    return { ok: true };
  }
}
