import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateDealRequest, UpdateDealRequest } from '@gnevo/types';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AutomationEngineService } from '../automations/automation-engine.service.js';
import { ActivityService } from '../events/activity.service.js';
import { NotificationsService } from '../events/notifications.service.js';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: AutomationEngineService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationsService,
  ) {}

  /** The default pipeline with its stages and each stage's open deals (Kanban). */
  async getBoard(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    const pipeline = await db.pipeline.findFirst({
      where: { isDefault: true },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
    if (!pipeline) {
      return { pipeline: null, stages: [], forecast: 0 };
    }

    const deals = await db.deal.findMany({
      where: { pipelineId: pipeline.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const stages = pipeline.stages.map((stage) => {
      const stageDeals = deals
        .filter((d) => d.stageId === stage.id)
        .map((d) => ({
          id: d.id,
          title: d.title,
          value: Number(d.value),
          currency: d.currency,
          status: d.status,
        }));
      return {
        id: stage.id,
        name: stage.name,
        position: stage.position,
        total: stageDeals.reduce((s, d) => s + d.value, 0),
        deals: stageDeals,
      };
    });

    const forecast = deals
      .filter((d) => d.status === 'open')
      .reduce((s, d) => s + Number(d.value), 0);

    return {
      pipeline: { id: pipeline.id, name: pipeline.name },
      stages,
      forecast,
    };
  }

  async create(organizationId: string, dto: CreateDealRequest) {
    const db = this.prisma.forTenant(organizationId);
    const stage = await db.pipelineStage.findFirst({ where: { id: dto.stageId } });
    if (!stage) throw new BadRequestException('Invalid stage');
    const deal = await db.deal.create({
      data: {
        organizationId,
        pipelineId: stage.pipelineId,
        stageId: stage.id,
        title: dto.title,
        value: dto.value,
        currency: dto.currency,
        ownerId: dto.ownerId ?? null,
        customerId: dto.customerId ?? null,
      },
    });
    await this.engine.trigger(organizationId, 'deal.created', {
      dealId: deal.id,
      title: deal.title,
    });
    await this.activity.log(organizationId, {
      verb: 'created',
      entityType: 'deal',
      entityId: deal.id,
      summary: `Deal "${deal.title}" was created in "${stage.name}"`,
    });
    if (deal.ownerId) {
      await this.notifications.notify(organizationId, deal.ownerId, {
        title: 'New deal assigned',
        body: deal.title,
        link: `/deals`,
        type: 'deal',
      });
    }
    return deal;
  }

  async move(organizationId: string, id: string, stageId: string) {
    const db = this.prisma.forTenant(organizationId);
    const deal = await db.deal.findFirst({ where: { id, deletedAt: null } });
    if (!deal) throw new NotFoundException('Deal not found');
    const stage = await db.pipelineStage.findFirst({ where: { id: stageId } });
    if (!stage) throw new BadRequestException('Invalid stage');
    const updated = await db.deal.update({ where: { id }, data: { stageId } });
    await this.engine.trigger(organizationId, 'deal.stage_changed', {
      dealId: id,
      stageId,
      stageName: stage.name,
    });
    await this.activity.log(organizationId, {
      verb: 'stage_changed',
      entityType: 'deal',
      entityId: id,
      summary: `Deal "${deal.title}" moved to "${stage.name}"`,
    });
    return updated;
  }

  async update(organizationId: string, id: string, dto: UpdateDealRequest) {
    const db = this.prisma.forTenant(organizationId);
    const deal = await db.deal.findFirst({ where: { id, deletedAt: null } });
    if (!deal) throw new NotFoundException('Deal not found');
    return db.deal.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const deal = await db.deal.findFirst({ where: { id, deletedAt: null } });
    if (!deal) throw new NotFoundException('Deal not found');
    await db.deal.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }
}
