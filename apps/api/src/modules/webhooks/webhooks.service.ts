import { randomBytes } from 'node:crypto';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { QueueService } from '../../queue/queue.service.js';

const WEBHOOK_JOB_OPTS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 3000 },
  removeOnComplete: { age: 3600, count: 500 },
  removeOnFail: { age: 24 * 3600 },
};

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async list(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.webhookEndpoint.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        lastStatus: true,
        lastFiredAt: true,
        failureCount: true,
        createdAt: true,
      },
    });
  }

  async create(organizationId: string, url: string, events: string[]) {
    const db = this.prisma.forTenant(organizationId);
    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    return db.webhookEndpoint.create({
      data: { organizationId, url, events, secret },
      select: { id: true, url: true, events: true, active: true, secret: true, createdAt: true },
    });
  }

  async update(organizationId: string, id: string, patch: { url?: string; events?: string[] }) {
    const db = this.prisma.forTenant(organizationId);
    const found = await db.webhookEndpoint.findFirst({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('Webhook not found');
    return db.webhookEndpoint.update({
      where: { id },
      data: {
        ...(patch.url !== undefined ? { url: patch.url } : {}),
        ...(patch.events !== undefined ? { events: patch.events } : {}),
      },
      select: { id: true, url: true, events: true, active: true },
    });
  }

  async toggle(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const w = await db.webhookEndpoint.findFirst({ where: { id }, select: { active: true } });
    if (!w) throw new NotFoundException('Webhook not found');
    return db.webhookEndpoint.update({
      where: { id },
      data: { active: !w.active },
      select: { id: true, active: true },
    });
  }

  async regenerateSecret(organizationId: string, id: string): Promise<{ secret: string }> {
    const db = this.prisma.forTenant(organizationId);
    const found = await db.webhookEndpoint.findFirst({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('Webhook not found');
    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    await db.webhookEndpoint.update({ where: { id }, data: { secret } });
    return { secret };
  }

  async remove(organizationId: string, id: string): Promise<{ ok: true }> {
    const db = this.prisma.forTenant(organizationId);
    const found = await db.webhookEndpoint.findFirst({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('Webhook not found');
    await db.webhookEndpoint.delete({ where: { id } });
    return { ok: true };
  }

  async listDeliveries(organizationId: string, webhookId: string) {
    const db = this.prisma.forTenant(organizationId);
    const found = await db.webhookEndpoint.findFirst({ where: { id: webhookId }, select: { id: true } });
    if (!found) throw new NotFoundException('Webhook not found');
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId, organizationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /** Queue a test delivery for one endpoint. */
  async test(organizationId: string, id: string): Promise<{ ok: true }> {
    const db = this.prisma.forTenant(organizationId);
    const w = await db.webhookEndpoint.findFirst({ where: { id }, select: { id: true } });
    if (!w) throw new NotFoundException('Webhook not found');
    await this.enqueue(organizationId, id, 'webhook.test', {
      message: 'This is a test event from Gnevo CRM.',
      sentBy: 'test-button',
    });
    return { ok: true };
  }

  private async enqueue(
    organizationId: string,
    webhookId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.queue.webhooks.add(
      'deliver',
      {
        organizationId,
        webhookId,
        event,
        timestamp: new Date().toISOString(),
        data,
      },
      WEBHOOK_JOB_OPTS,
    );
  }

  /** Fan out an event to all matching active endpoints (best-effort, async). */
  dispatch(organizationId: string, event: string, data: Record<string, unknown>): void {
    void (async () => {
      try {
        const db = this.prisma.forTenant(organizationId);
        const endpoints = await db.webhookEndpoint.findMany({ where: { active: true } });
        const targets = endpoints.filter(
          (e) => e.events.length === 0 || e.events.includes('*') || e.events.includes(event),
        );
        await Promise.all(targets.map((ep) => this.enqueue(organizationId, ep.id, event, data)));
      } catch (err) {
        this.logger.warn(`Webhook dispatch for '${event}' failed to enqueue: ${(err as Error).message}`);
      }
    })();
  }
}
