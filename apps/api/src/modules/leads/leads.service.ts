import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chatComplete, resolveProviderFromEnv } from '@gnevo/ai';
import type {
  CreateLeadRequest,
  ListLeadsQuery,
  UpdateLeadRequest,
} from '@gnevo/types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Env } from '../../config/config.schema.js';
import { AutomationEngineService } from '../automations/automation-engine.service.js';
import { ActivityService } from '../events/activity.service.js';
import { NotificationsService } from '../events/notifications.service.js';
import { AuditService } from '../events/audit.service.js';

/**
 * Lead CRUD. Every call is tenant-scoped via `prisma.forTenant(orgId)`, so
 * `organizationId` is injected on reads and writes — no lead from another
 * tenant is reachable. Uses keyset pagination for scale.
 */
@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: AutomationEngineService,
    private readonly config: ConfigService<Env, true>,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string, query: ListLeadsQuery) {
    const db = this.prisma.forTenant(organizationId);
    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' as const } },
              { company: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const rows = await db.lead.findMany({
      where,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'desc' },
    });

    const hasMore = rows.length > query.limit;
    const data = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      data,
      pagination: {
        nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
        hasMore,
        limit: query.limit,
      },
    };
  }

  async get(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const lead = await db.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async create(organizationId: string, dto: CreateLeadRequest) {
    const db = this.prisma.forTenant(organizationId);
    const lead = await db.lead.create({
      data: {
        // Also injected by the tenant client; set here to satisfy Prisma types.
        organizationId,
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        company: dto.company ?? null,
        source: dto.source,
        ownerId: dto.ownerId ?? null,
      },
    });
    await this.engine.trigger(organizationId, 'lead.created', {
      leadId: lead.id,
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      score: lead.score,
      createdAt: lead.createdAt,
      ownerId: lead.ownerId,
    });
    await this.activity.log(organizationId, {
      verb: 'created',
      entityType: 'lead',
      entityId: lead.id,
      summary: `Lead "${lead.name}" was created`,
    });
    if (lead.ownerId) {
      await this.notifications.notify(organizationId, lead.ownerId, {
        title: 'New lead assigned',
        body: lead.name,
        link: `/leads/${lead.id}`,
        type: 'lead',
      });
    }
    return lead;
  }

  async update(organizationId: string, id: string, dto: UpdateLeadRequest) {
    const before = await this.get(organizationId, id); // 404 if not in tenant
    const db = this.prisma.forTenant(organizationId);
    const lead = await db.lead.update({ where: { id }, data: dto });
    if (dto.status && dto.status !== before.status) {
      await this.engine.trigger(organizationId, 'lead.status_changed', {
        leadId: lead.id,
        name: lead.name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        previousStatus: before.status,
        score: lead.score,
        ownerId: lead.ownerId,
      });
    }
    return lead;
  }

  async remove(organizationId: string, id: string, actorId?: string) {
    const lead = await this.get(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    await db.lead.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record(organizationId, {
      actorId,
      action: 'lead.deleted',
      resource: 'lead',
      resourceId: id,
      before: { name: lead.name },
    });
    return { id, deleted: true };
  }

  /** Convert a lead into a customer (+ primary contact) and mark it converted. */
  async convert(
    organizationId: string,
    id: string,
    actorId?: string,
  ): Promise<{ customerId: string }> {
    const lead = await this.get(organizationId, id);
    if (lead.status === 'converted') {
      throw new BadRequestException('This lead has already been converted');
    }
    const db = this.prisma.forTenant(organizationId);

    const customer = await db.customer.create({
      data: {
        organizationId,
        name: lead.company || lead.name,
        type: 'company',
        ownerId: lead.ownerId ?? null,
      },
    });
    await db.contact.create({
      data: {
        organizationId,
        customerId: customer.id,
        name: lead.name,
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        isPrimary: true,
      },
    });
    await db.lead.update({ where: { id }, data: { status: 'converted' } });

    await this.activity.log(organizationId, {
      verb: 'converted',
      entityType: 'lead',
      entityId: id,
      summary: `Lead "${lead.name}" was converted to customer "${customer.name}"`,
    });
    await this.activity.log(organizationId, {
      verb: 'created',
      entityType: 'customer',
      entityId: customer.id,
      summary: `Customer "${customer.name}" created from a lead`,
    });
    await this.audit.record(organizationId, {
      actorId,
      action: 'lead.converted',
      resource: 'lead',
      resourceId: id,
      after: { customerId: customer.id },
    });
    if (customer.ownerId) {
      await this.notifications.notify(organizationId, customer.ownerId, {
        title: 'Lead converted to customer',
        body: customer.name,
        link: `/customers/${customer.id}`,
        type: 'customer',
      });
    }
    return { customerId: customer.id };
  }

  /**
   * Field-level merge: keep `survivorId` with the chosen field values, move the
   * losing lead's notes onto it, then soft-delete the loser.
   */
  async merge(
    organizationId: string,
    survivorId: string,
    losingId: string,
    data: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      company?: string | null;
      source?: string;
      status?: string;
    },
    actorId?: string,
  ): Promise<{ id: string }> {
    if (survivorId === losingId) throw new BadRequestException('Cannot merge a lead into itself');
    const survivor = await this.get(organizationId, survivorId);
    const losing = await this.get(organizationId, losingId);
    const db = this.prisma.forTenant(organizationId);

    await db.lead.update({
      where: { id: survivorId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.company !== undefined ? { company: data.company } : {}),
        ...(data.source !== undefined ? { source: data.source } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
    // Move the loser's notes onto the survivor so history isn't lost.
    await db.note.updateMany({
      where: { entityType: 'lead', entityId: losingId },
      data: { entityId: survivorId },
    });
    await db.lead.update({ where: { id: losingId }, data: { deletedAt: new Date() } });

    await this.activity.log(organizationId, {
      verb: 'merged',
      entityType: 'lead',
      entityId: survivorId,
      summary: `Lead "${losing.name}" was merged into "${survivor.name}"`,
    });
    await this.audit.record(organizationId, {
      actorId,
      action: 'lead.merged',
      resource: 'lead',
      resourceId: survivorId,
      before: { mergedLeadId: losingId },
    });
    return { id: survivorId };
  }

  /** Group non-deleted leads that share an email — potential duplicates. */
  async duplicates(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    const leads = await db.lead.findMany({
      where: { deletedAt: null, email: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        source: true,
        status: true,
        createdAt: true,
      },
    });
    const groups = new Map<string, typeof leads>();
    for (const l of leads) {
      const key = (l.email ?? '').toLowerCase().trim();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(l);
    }
    return [...groups.entries()]
      .filter(([, v]) => v.length > 1)
      .map(([email, dupes]) => ({ email, leads: dupes }));
  }

  /** AI lead scoring: 0–100 likelihood-to-convert, stored on the lead. */
  async score(organizationId: string, id: string): Promise<{ score: number }> {
    const lead = await this.get(organizationId, id);
    const orgRow = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const aiPref = ((orgRow?.settings as Record<string, unknown>)?.ai ?? {}) as {
      provider?: 'groq' | 'openrouter' | 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'xai';
      model?: string;
    };
    const resolved = resolveProviderFromEnv(process.env, aiPref.provider);
    if (!resolved) {
      throw new BadRequestException({
        title: 'No AI provider configured',
        message: 'Add an AI API key to .env (see docs/23-service-setup.md).',
      });
    }
    const prompt =
      `Score this sales lead 0-100 for likelihood to convert, based on the signals below. ` +
      `Respond with ONLY an integer 0-100, no words.\n` +
      `Name: ${lead.name}\nCompany: ${lead.company ?? 'unknown'}\n` +
      `Source: ${lead.source}\nStatus: ${lead.status}\nEmail: ${lead.email ?? 'none'}`;

    const text = await chatComplete({
      provider: resolved.provider,
      apiKey: resolved.apiKey,
      model: aiPref.model,
      messages: [{ role: 'user', content: prompt }],
    });
    const parsed = parseInt(text.replace(/[^0-9]/g, '').slice(0, 3), 10);
    const score = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 50;

    const db = this.prisma.forTenant(organizationId);
    await db.lead.update({ where: { id }, data: { score } });
    return { score };
  }
}
