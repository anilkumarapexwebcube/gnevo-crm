import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateAutomationRequest,
  UpdateAutomationRequest,
} from '@gnevo/types';
import type { Prisma } from '@gnevo/db';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AutomationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.automation.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { runs: true } } },
    });
  }

  async get(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const automation = await db.automation.findFirst({
      where: { id, deletedAt: null },
      include: { runs: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!automation) throw new NotFoundException('Automation not found');
    return automation;
  }

  async create(organizationId: string, dto: CreateAutomationRequest) {
    const db = this.prisma.forTenant(organizationId);
    return db.automation.create({
      data: {
        organizationId,
        name: dto.name,
        triggerType: dto.triggerType,
        definition: dto.definition as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateAutomationRequest) {
    await this.get(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    return db.automation.update({
      where: { id },
      data: {
        name: dto.name,
        triggerType: dto.triggerType,
        isActive: dto.isActive,
        ...(dto.definition
          ? { definition: dto.definition as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.get(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    await db.automation.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }
}
