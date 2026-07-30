import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chatComplete, resolveProviderFromEnv } from '@gnevo/ai';
import type {
  CreateContactRequest,
  CreateCustomerRequest,
  ListCustomersQuery,
  UpdateCustomerRequest,
} from '@gnevo/types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Env } from '../../config/config.schema.js';
import { AutomationEngineService } from '../automations/automation-engine.service.js';
import { ActivityService } from '../events/activity.service.js';
import { NotificationsService } from '../events/notifications.service.js';
import { AuditService } from '../events/audit.service.js';

/**
 * Customer CRUD. Tenant-scoped via `prisma.forTenant(orgId)`, keyset paginated.
 */
@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: AutomationEngineService,
    private readonly config: ConfigService<Env, true>,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string, query: ListCustomersQuery) {
    const db = this.prisma.forTenant(organizationId);
    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.q
        ? { name: { contains: query.q, mode: 'insensitive' as const } }
        : {}),
    };

    const rows = await db.customer.findMany({
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
    const customer = await db.customer.findFirst({
      where: { id, deletedAt: null },
      include: { contacts: { where: { deletedAt: null } } },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    let accountManager: { id: string; fullName: string } | null = null;
    if (customer.accountManagerId) {
      accountManager = await this.prisma.user.findFirst({
        where: { id: customer.accountManagerId, organizationId },
        select: { id: true, fullName: true },
      });
    }
    return { ...customer, accountManager };
  }

  /** Assign (or clear) the account manager for a customer. */
  async setAccountManager(organizationId: string, id: string, userId: string | null) {
    const db = this.prisma.forTenant(organizationId);
    const customer = await db.customer.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (userId) {
      const mgr = await db.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true } });
      if (!mgr) throw new NotFoundException('User not found');
    }
    await db.customer.update({ where: { id }, data: { accountManagerId: userId } });
    return { ok: true };
  }

  async create(organizationId: string, dto: CreateCustomerRequest) {
    const db = this.prisma.forTenant(organizationId);
    const customer = await db.customer.create({
      data: {
        organizationId,
        name: dto.name,
        type: dto.type,
        industry: dto.industry ?? null,
        website: dto.website ?? null,
        ownerId: dto.ownerId ?? null,
      },
    });
    await this.engine.trigger(organizationId, 'customer.created', {
      customerId: customer.id,
      name: customer.name,
    });
    await this.activity.log(organizationId, {
      verb: 'created',
      entityType: 'customer',
      entityId: customer.id,
      summary: `Customer "${customer.name}" was created`,
    });
    if (customer.ownerId) {
      await this.notifications.notify(organizationId, customer.ownerId, {
        title: 'New customer assigned',
        body: customer.name,
        link: `/customers/${customer.id}`,
        type: 'customer',
      });
    }
    return customer;
  }

  async update(organizationId: string, id: string, dto: UpdateCustomerRequest) {
    await this.get(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    return db.customer.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string, actorId?: string) {
    const customer = await this.get(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    await db.customer.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record(organizationId, {
      actorId,
      action: 'customer.deleted',
      resource: 'customer',
      resourceId: id,
      before: { name: customer.name },
    });
    return { id, deleted: true };
  }

  async listContacts(organizationId: string, customerId: string) {
    await this.get(organizationId, customerId);
    const db = this.prisma.forTenant(organizationId);
    return db.contact.findMany({
      where: { customerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addContact(organizationId: string, customerId: string, dto: CreateContactRequest) {
    await this.get(organizationId, customerId);
    const db = this.prisma.forTenant(organizationId);
    return db.contact.create({
      data: {
        organizationId,
        customerId,
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        title: dto.title ?? null,
      },
    });
  }

  /** AI insights: churn risk + upsell opportunity for a customer, from its data. */
  async insights(
    organizationId: string,
    id: string,
  ): Promise<{ churnRisk: string; upsell: string; summary: string }> {
    const db = this.prisma.forTenant(organizationId);
    const customer = await db.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        deals: { where: { deletedAt: null }, select: { value: true, status: true } },
        invoices: {
          where: { deletedAt: null },
          select: { status: true, lines: { select: { quantity: true, unitPrice: true } } },
        },
        contacts: { where: { deletedAt: null }, select: { id: true } },
        tickets: { where: { deletedAt: null }, select: { status: true } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');

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

    const wonValue = customer.deals
      .filter((d) => d.status === 'won')
      .reduce((s, d) => s + Number(d.value), 0);
    const openDeals = customer.deals.filter((d) => d.status === 'open').length;
    const paidRevenue = customer.invoices
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + i.lines.reduce((x, l) => x + l.quantity * Number(l.unitPrice), 0), 0);
    const openTickets = customer.tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length;

    const facts =
      `Name: ${customer.name}\nStatus: ${customer.status}\nType: ${customer.type}\n` +
      `Industry: ${customer.industry ?? 'unknown'}\nContacts: ${customer.contacts.length}\n` +
      `Deals: ${customer.deals.length} (open ${openDeals}), won value ${wonValue}\n` +
      `Paid revenue: ${paidRevenue}\nOpen support tickets: ${openTickets}`;

    const prompt =
      `You are a CRM analyst for a digital marketing agency. Assess this customer's churn risk and upsell potential.\n` +
      `Respond with STRICT JSON only, no markdown: {"churnRisk":"low|medium|high","upsell":"one concise sentence","summary":"2-3 sentence assessment"}.\n\n${facts}`;

    const text = await chatComplete({
      provider: resolved.provider,
      apiKey: resolved.apiKey,
      model: aiPref.model,
      messages: [{ role: 'user', content: prompt }],
    });

    // Robust parse: extract the first {...} block.
    let churnRisk = 'medium';
    let upsell = '';
    let summary = text.trim();
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as {
          churnRisk?: string;
          upsell?: string;
          summary?: string;
        };
        const r = (parsed.churnRisk ?? '').toLowerCase();
        churnRisk = ['low', 'medium', 'high'].includes(r) ? r : 'medium';
        upsell = parsed.upsell ?? '';
        summary = parsed.summary ?? summary;
      }
    } catch {
      /* keep raw text as summary */
    }
    return { churnRisk, upsell, summary };
  }

  /* ── Client health snapshots ── */

  private async computeSnapshot(db: ReturnType<PrismaService['forTenant']>, customerId: string) {
    const customer = await db.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      include: {
        deals: { where: { deletedAt: null }, select: { value: true, status: true } },
        invoices: {
          where: { deletedAt: null },
          select: { status: true, lines: { select: { quantity: true, unitPrice: true } } },
        },
        tickets: { where: { deletedAt: null }, select: { status: true } },
        projects: { where: { deletedAt: null }, select: { status: true } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const invoiceTotal = (i: { lines: { quantity: number; unitPrice: unknown }[] }) =>
      i.lines.reduce((x, l) => x + l.quantity * Number(l.unitPrice), 0);

    const openDeals = customer.deals.filter((d) => d.status === 'open');
    const openDealsValue = openDeals.reduce((s, d) => s + Number(d.value), 0);
    const wonValue = customer.deals.filter((d) => d.status === 'won').reduce((s, d) => s + Number(d.value), 0);
    const paidRevenue = customer.invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + invoiceTotal(i), 0);
    const outstanding = customer.invoices
      .filter((i) => i.status !== 'paid' && i.status !== 'void' && i.status !== 'draft')
      .reduce((s, i) => s + invoiceTotal(i), 0);
    const openTickets = customer.tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length;
    const openProjects = customer.projects.filter((p) => p.status === 'active').length;

    // Simple health heuristic (0-100): revenue + engagement up, unpaid + open tickets down.
    let score = 60;
    if (paidRevenue > 0) score += 15;
    if (wonValue > 0) score += 10;
    if (openDeals.length > 0) score += 5;
    if (openProjects > 0) score += 5;
    score -= Math.min(openTickets * 5, 20);
    if (outstanding > 0) score -= 10;
    if (customer.status !== 'active') score -= 20;
    score = Math.max(0, Math.min(100, score));

    return {
      openDeals: openDeals.length,
      openDealsValue,
      wonValue,
      paidRevenue,
      outstanding,
      openTickets,
      openProjects,
      healthScore: score,
    };
  }

  async captureSnapshot(organizationId: string, customerId: string) {
    const db = this.prisma.forTenant(organizationId);
    const metrics = await this.computeSnapshot(db, customerId);
    return db.clientSnapshot.create({ data: { organizationId, customerId, ...metrics } });
  }

  async listSnapshots(organizationId: string, customerId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.clientSnapshot.findMany({
      where: { customerId },
      orderBy: { capturedAt: 'asc' },
      take: 60,
    });
  }

  /** Capture snapshots for every active customer — called by the scheduled worker. */
  async captureAllSnapshots(organizationId: string): Promise<number> {
    const db = this.prisma.forTenant(organizationId);
    const customers = await db.customer.findMany({ where: { deletedAt: null }, select: { id: true } });
    let n = 0;
    for (const c of customers) {
      try {
        const metrics = await this.computeSnapshot(db, c.id);
        await db.clientSnapshot.create({ data: { organizationId, customerId: c.id, ...metrics } });
        n += 1;
      } catch {
        /* skip individual failures */
      }
    }
    return n;
  }
}
