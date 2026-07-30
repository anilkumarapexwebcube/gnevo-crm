import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

interface Bucket {
  key: string;
  count: number;
  value?: number;
}

function countBy<T>(rows: T[], pick: (r: T) => string): Bucket[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = pick(r);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([key, count]) => ({ key, count }));
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    const [leads, deals, invoices, tasks, stages] = await Promise.all([
      db.lead.findMany({ where: { deletedAt: null }, select: { status: true, source: true } }),
      db.deal.findMany({
        where: { deletedAt: null },
        select: { stageId: true, value: true, status: true },
      }),
      db.invoice.findMany({
        where: { deletedAt: null },
        select: { status: true, lines: { select: { quantity: true, unitPrice: true } } },
      }),
      db.task.findMany({ where: { deletedAt: null }, select: { status: true } }),
      db.pipelineStage.findMany({
        select: { id: true, name: true, position: true },
        orderBy: { position: 'asc' },
      }),
    ]);

    const invoiceTotal = (lines: { quantity: number; unitPrice: unknown }[]) =>
      lines.reduce((s, l) => s + l.quantity * Number(l.unitPrice), 0);

    // Deals by stage (count + total value).
    const dealsByStage: Bucket[] = stages.map((stage) => {
      const stageDeals = deals.filter((d) => d.stageId === stage.id);
      return {
        key: stage.name,
        count: stageDeals.length,
        value: stageDeals.reduce((s, d) => s + Number(d.value), 0),
      };
    });

    // Revenue by invoice status.
    const revByStatus = new Map<string, number>();
    for (const inv of invoices) {
      revByStatus.set(inv.status, (revByStatus.get(inv.status) ?? 0) + invoiceTotal(inv.lines));
    }
    const invoiceRevenue: Bucket[] = [...revByStatus.entries()].map(([key, value]) => ({
      key,
      count: invoices.filter((i) => i.status === key).length,
      value,
    }));

    const paidRevenue = revByStatus.get('paid') ?? 0;
    const openForecast = deals
      .filter((d) => d.status === 'open')
      .reduce((s, d) => s + Number(d.value), 0);

    return {
      totals: {
        leads: leads.length,
        openForecast,
        paidRevenue,
        openTasks: tasks.filter((t) => t.status !== 'done').length,
      },
      leadsByStatus: countBy(leads, (l) => l.status),
      leadsBySource: countBy(leads, (l) => l.source),
      dealsByStage,
      invoiceRevenue,
      tasksByStatus: countBy(tasks, (t) => t.status),
    };
  }

  /**
   * Advanced BI dashboard: headline KPIs, conversion funnel, 6-month
   * leads-vs-revenue trend, top customers by revenue, and deals by stage.
   */
  async bi(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    const [leads, customers, deals, invoices, stages] = await Promise.all([
      db.lead.findMany({ where: { deletedAt: null }, select: { status: true, createdAt: true } }),
      db.customer.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
      db.deal.findMany({ where: { deletedAt: null }, select: { value: true, status: true, stageId: true } }),
      db.invoice.findMany({
        where: { deletedAt: null },
        select: { status: true, createdAt: true, customerId: true, lines: { select: { quantity: true, unitPrice: true } } },
      }),
      db.pipelineStage.findMany({ select: { id: true, name: true, position: true }, orderBy: { position: 'asc' } }),
    ]);

    const invTotal = (lines: { quantity: number; unitPrice: unknown }[]) =>
      lines.reduce((s, l) => s + l.quantity * Number(l.unitPrice), 0);

    const wonDeals = deals.filter((d) => d.status === 'won');
    const openDeals = deals.filter((d) => d.status === 'open');
    const wonValue = wonDeals.reduce((s, d) => s + Number(d.value), 0);
    const pipelineValue = openDeals.reduce((s, d) => s + Number(d.value), 0);
    const paidRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + invTotal(i.lines), 0);

    const kpis = {
      leads: leads.length,
      customers: customers.length,
      conversionRate: leads.length ? Math.round((customers.length / leads.length) * 100) : 0,
      pipelineValue,
      wonValue,
      paidRevenue,
      avgDealSize: wonDeals.length ? Math.round(wonValue / wonDeals.length) : 0,
    };

    const funnel = [
      { key: 'Leads', value: leads.length },
      { key: 'Customers', value: customers.length },
      { key: 'Deals', value: deals.length },
      { key: 'Won', value: wonDeals.length },
    ];

    // 6-month trend: new leads + collected revenue.
    const now = new Date();
    const months: { key: string; leads: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }), leads: 0, revenue: 0 });
    }
    const idxOf = (d: Date) => 5 - ((now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()));
    for (const l of leads) {
      const idx = idxOf(new Date(l.createdAt));
      if (idx >= 0 && idx <= 5) months[idx]!.leads += 1;
    }
    for (const inv of invoices) {
      if (inv.status !== 'paid') continue;
      const idx = idxOf(new Date(inv.createdAt));
      if (idx >= 0 && idx <= 5) months[idx]!.revenue += invTotal(inv.lines);
    }

    // Top customers by paid revenue.
    const revByCustomer = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.status !== 'paid' || !inv.customerId) continue;
      revByCustomer.set(inv.customerId, (revByCustomer.get(inv.customerId) ?? 0) + invTotal(inv.lines));
    }
    const nameOf = new Map(customers.map((c) => [c.id, c.name]));
    const topCustomers = [...revByCustomer.entries()]
      .map(([id, value]) => ({ key: nameOf.get(id) ?? 'Unknown', value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const dealsByStage = stages.map((s) => ({
      key: s.name,
      count: deals.filter((d) => d.stageId === s.id).length,
      value: deals.filter((d) => d.stageId === s.id).reduce((x, d) => x + Number(d.value), 0),
    }));

    return { kpis, funnel, trend: months, topCustomers, dealsByStage };
  }

  /**
   * Accounts-receivable report: outstanding total, AR aging buckets by days
   * overdue, and a 6-month billed-vs-collected trend.
   */
  async arReport(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    const invoices = await db.invoice.findMany({
      where: { deletedAt: null },
      select: {
        status: true,
        dueDate: true,
        createdAt: true,
        lines: { select: { quantity: true, unitPrice: true } },
      },
    });
    const total = (lines: { quantity: number; unitPrice: unknown }[]) =>
      lines.reduce((s, l) => s + l.quantity * Number(l.unitPrice), 0);

    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(now);

    // Outstanding = sent/pending/overdue invoices (not draft/paid/void).
    const outstandingInvoices = invoices.filter(
      (i) => !['draft', 'paid', 'void'].includes(i.status),
    );
    const paidTotal = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + total(i.lines), 0);
    const outstandingTotal = outstandingInvoices.reduce((s, i) => s + total(i.lines), 0);

    const buckets = [
      { key: 'Not due', min: -Infinity, max: 0, value: 0, count: 0 },
      { key: '1–30 days', min: 1, max: 30, value: 0, count: 0 },
      { key: '31–60 days', min: 31, max: 60, value: 0, count: 0 },
      { key: '61–90 days', min: 61, max: 90, value: 0, count: 0 },
      { key: '90+ days', min: 91, max: Infinity, value: 0, count: 0 },
    ];
    for (const inv of outstandingInvoices) {
      const amt = total(inv.lines);
      const daysOverdue = inv.dueDate
        ? Math.round((today.getTime() - startOfDay(new Date(inv.dueDate)).getTime()) / 86_400_000)
        : 0;
      const b = buckets.find((x) => daysOverdue >= x.min && daysOverdue <= x.max) ?? buckets[0]!;
      b.value += amt;
      b.count += 1;
    }

    // 6-month billed (all non-draft) vs collected (paid) trend.
    const months: { key: string; billed: number; collected: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }), billed: 0, collected: 0 });
    }
    const monthIndex = (d: Date) => {
      const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      return 5 - diff;
    };
    for (const inv of invoices) {
      if (inv.status === 'draft' || inv.status === 'void') continue;
      const idx = monthIndex(new Date(inv.createdAt));
      if (idx < 0 || idx > 5) continue;
      const amt = total(inv.lines);
      months[idx]!.billed += amt;
      if (inv.status === 'paid') months[idx]!.collected += amt;
    }

    const overdueTotal = buckets.filter((b) => b.min >= 1).reduce((s, b) => s + b.value, 0);

    return {
      totals: {
        outstanding: outstandingTotal,
        overdue: overdueTotal,
        collected: paidTotal,
        openInvoices: outstandingInvoices.length,
      },
      aging: buckets.map((b) => ({ key: b.key, count: b.count, value: b.value })),
      trend: months,
    };
  }

  /**
   * Ad-hoc report: aggregate a chosen source by a dimension, as a count or a
   * sum. Returns `{ rows: [{label, value}], metric, valueLabel }`.
   */
  async custom(
    organizationId: string,
    opts: { source: string; groupBy: string; metric: string },
  ) {
    const db = this.prisma.forTenant(organizationId);
    const metric = opts.metric === 'sum' ? 'sum' : 'count';
    const humanize = (s: string) =>
      (s || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const tally = (pairs: { key: string; value: number }[]) => {
      const m = new Map<string, number>();
      for (const p of pairs) m.set(p.key, (m.get(p.key) ?? 0) + p.value);
      return [...m.entries()]
        .map(([label, value]) => ({ label: humanize(label), value }))
        .sort((a, b) => b.value - a.value);
    };

    if (opts.source === 'customers') {
      const rows = await db.customer.findMany({
        where: { deletedAt: null },
        select: { status: true, type: true },
      });
      const pairs = rows.map((r) => ({
        key: opts.groupBy === 'type' ? r.type : r.status,
        value: 1,
      }));
      return { metric: 'count', valueLabel: 'Customers', rows: tally(pairs) };
    }

    if (opts.source === 'deals') {
      const deals = await db.deal.findMany({
        where: { deletedAt: null },
        select: { status: true, stageId: true, value: true },
      });
      let keyFor: (d: (typeof deals)[number]) => string = (d) => d.status;
      if (opts.groupBy === 'stage') {
        const stages = await db.pipelineStage.findMany({ select: { id: true, name: true } });
        const nameById = new Map(stages.map((s) => [s.id, s.name]));
        keyFor = (d) => nameById.get(d.stageId) ?? 'Unknown';
      }
      const pairs = deals.map((d) => ({
        key: keyFor(d),
        value: metric === 'sum' ? Number(d.value) : 1,
      }));
      return { metric, valueLabel: metric === 'sum' ? 'Value' : 'Deals', rows: tally(pairs) };
    }

    if (opts.source === 'invoices') {
      const invoices = await db.invoice.findMany({
        where: { deletedAt: null },
        select: { status: true, lines: { select: { quantity: true, unitPrice: true } } },
      });
      const pairs = invoices.map((inv) => ({
        key: inv.status,
        value:
          metric === 'sum'
            ? inv.lines.reduce((s, l) => s + l.quantity * Number(l.unitPrice), 0)
            : 1,
      }));
      return { metric, valueLabel: metric === 'sum' ? 'Revenue' : 'Invoices', rows: tally(pairs) };
    }

    // default: leads
    const leads = await db.lead.findMany({
      where: { deletedAt: null },
      select: { status: true, source: true },
    });
    const pairs = leads.map((l) => ({
      key: opts.groupBy === 'source' ? l.source : l.status,
      value: 1,
    }));
    return { metric: 'count', valueLabel: 'Leads', rows: tally(pairs) };
  }
}
