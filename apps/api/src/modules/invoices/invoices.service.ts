import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { CreateInvoiceRequest, InvoiceStatus, ListInvoicesQuery } from '@gnevo/types';
import type { Prisma } from '@gnevo/db';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../events/activity.service.js';
import { AuditService } from '../events/audit.service.js';
import type { Env } from '../../config/config.schema.js';

interface LineRow {
  quantity: number;
  unitPrice: Prisma.Decimal | number;
}

function invoiceTotal(lines: LineRow[]): number {
  return lines.reduce((sum, l) => sum + l.quantity * Number(l.unitPrice), 0);
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly activity: ActivityService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string, query: ListInvoicesQuery) {
    const db = this.prisma.forTenant(organizationId);
    const rows = await db.invoice.findMany({
      where: { deletedAt: null, ...(query.status ? { status: query.status } : {}) },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'desc' },
      include: { lines: true, customer: { select: { name: true } } },
    });
    const hasMore = rows.length > query.limit;
    const data = (hasMore ? rows.slice(0, query.limit) : rows).map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      currency: inv.currency,
      customerName: inv.customer?.name ?? null,
      total: invoiceTotal(inv.lines),
      createdAt: inv.createdAt,
    }));
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
    const invoice = await db.invoice.findFirst({
      where: { id, deletedAt: null },
      include: { lines: true, customer: { select: { id: true, name: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return { ...invoice, total: invoiceTotal(invoice.lines) };
  }

  async create(organizationId: string, dto: CreateInvoiceRequest) {
    const db = this.prisma.forTenant(organizationId);
    const count = await db.invoice.count();
    const number = `INV-${String(count + 1).padStart(5, '0')}`;
    const invoice = await db.invoice.create({
      data: {
        organizationId,
        number,
        // New invoices are awaiting payment ("pending"), not incomplete drafts.
        status: dto.status ?? 'pending',
        currency: dto.currency,
        notes: dto.notes ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        customerId: dto.customerId ?? null,
        lines: {
          create: dto.lines.map((l) => ({
            organizationId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
        },
      },
      include: { lines: true },
    });
    await this.activity.log(organizationId, {
      verb: 'created',
      entityType: 'invoice',
      entityId: invoice.id,
      summary: `Invoice ${invoice.number} was created`,
    });
    return invoice;
  }

  async setStatus(organizationId: string, id: string, status: InvoiceStatus) {
    const existing = await this.get(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    const updated = await db.invoice.update({ where: { id }, data: { status } });
    await this.activity.log(organizationId, {
      verb: 'status_changed',
      entityType: 'invoice',
      entityId: id,
      summary: `Invoice ${existing.number} marked ${status}`,
    });
    return updated;
  }

  async remove(organizationId: string, id: string, actorId?: string) {
    const invoice = await this.get(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    await db.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record(organizationId, {
      actorId,
      action: 'invoice.deleted',
      resource: 'invoice',
      resourceId: id,
      before: { number: invoice.number, status: invoice.status },
    });
    return { id, deleted: true };
  }

  /** Create a Stripe Checkout Session (test mode) for the invoice; return its URL. */
  async checkout(organizationId: string, id: string): Promise<{ url: string }> {
    const secret = this.config.get('STRIPE_SECRET_KEY', { infer: true }) as string | undefined;
    if (!secret) {
      throw new BadRequestException({
        title: 'Stripe not configured',
        message: 'Add STRIPE_SECRET_KEY to .env (see docs/23-service-setup.md).',
      });
    }
    const invoice = await this.get(organizationId, id);
    if (invoice.lines.length === 0) throw new BadRequestException('Invoice has no line items');

    const stripe = new Stripe(secret);
    const webUrl = this.config.get('WEB_URL', { infer: true });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: invoice.lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: invoice.currency.toLowerCase(),
          unit_amount: Math.round(Number(l.unitPrice) * 100),
          product_data: { name: l.description },
        },
      })),
      success_url: `${webUrl}/invoices/${id}?checkout=success`,
      cancel_url: `${webUrl}/invoices/${id}?checkout=cancelled`,
      metadata: { invoiceId: id, organizationId },
    });

    const db = this.prisma.forTenant(organizationId);
    await db.invoice.update({
      where: { id },
      data: { stripeSessionId: session.id, status: invoice.status === 'draft' ? 'sent' : invoice.status },
    });

    if (!session.url) throw new BadRequestException('Stripe did not return a checkout URL');
    return { url: session.url };
  }

  /**
   * Verify payment directly with Stripe (called when the user returns from
   * Checkout). Marks the invoice paid if the session actually completed —
   * secure because it re-checks with Stripe rather than trusting the redirect.
   */
  async confirmPayment(organizationId: string, id: string): Promise<{ status: string }> {
    const secret = this.config.get('STRIPE_SECRET_KEY', { infer: true }) as string | undefined;
    const invoice = await this.get(organizationId, id);
    if (!secret || !invoice.stripeSessionId || invoice.status === 'paid') {
      return { status: invoice.status };
    }
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.retrieve(invoice.stripeSessionId);
    if (session.payment_status === 'paid') {
      const db = this.prisma.forTenant(organizationId);
      await db.invoice.update({ where: { id }, data: { status: 'paid' } });
      return { status: 'paid' };
    }
    return { status: invoice.status };
  }
}
