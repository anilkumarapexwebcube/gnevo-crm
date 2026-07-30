import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

const CATEGORIES = ['support', 'sales', 'billing', 'technical', 'custom'];

export interface CreateMacroInput {
  title: string;
  body: string;
  category?: string;
}

@Injectable()
export class MacrosService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, q?: string, category?: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.macro.findMany({
      where: {
        ...(category && category !== 'all' ? { category } : {}),
        ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(organizationId: string, dto: CreateMacroInput) {
    const db = this.prisma.forTenant(organizationId);
    const count = await db.macro.count();
    return db.macro.create({
      data: {
        organizationId,
        title: dto.title,
        body: dto.body,
        category: CATEGORIES.includes(dto.category ?? '') ? (dto.category as string) : 'custom',
        position: count,
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    patch: { title?: string; body?: string; category?: string },
  ) {
    const db = this.prisma.forTenant(organizationId);
    const m = await db.macro.findFirst({ where: { id }, select: { id: true } });
    if (!m) throw new NotFoundException('Macro not found');
    return db.macro.update({
      where: { id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.body !== undefined ? { body: patch.body } : {}),
        ...(patch.category && CATEGORIES.includes(patch.category) ? { category: patch.category } : {}),
      },
    });
  }

  async remove(organizationId: string, id: string): Promise<{ ok: true }> {
    const db = this.prisma.forTenant(organizationId);
    const m = await db.macro.findFirst({ where: { id }, select: { id: true } });
    if (!m) throw new NotFoundException('Macro not found');
    await db.macro.delete({ where: { id } });
    return { ok: true };
  }

  async duplicate(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const m = await db.macro.findFirst({ where: { id } });
    if (!m) throw new NotFoundException('Macro not found');
    const count = await db.macro.count();
    return db.macro.create({
      data: {
        organizationId,
        title: `${m.title} (copy)`,
        body: m.body,
        category: m.category,
        position: count,
      },
    });
  }

  async reorder(organizationId: string, id: string, direction: 'up' | 'down') {
    const db = this.prisma.forTenant(organizationId);
    const all = await db.macro.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
    const idx = all.findIndex((m) => m.id === id);
    if (idx === -1) throw new NotFoundException('Macro not found');
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= all.length) return { ok: true };
    const a = all[idx]!;
    const b = all[swapWith]!;
    await db.$transaction([
      db.macro.update({ where: { id: a.id }, data: { position: swapWith } }),
      db.macro.update({ where: { id: b.id }, data: { position: idx } }),
    ]);
    return { ok: true };
  }

  /** Bump usage stats when a macro is inserted into a reply. */
  async use(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const m = await db.macro.findFirst({ where: { id }, select: { id: true } });
    if (!m) throw new NotFoundException('Macro not found');
    return db.macro.update({
      where: { id },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
      select: { id: true, usageCount: true, lastUsedAt: true },
    });
  }
}
