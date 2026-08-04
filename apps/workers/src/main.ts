import { createHmac } from 'node:crypto';
import { Worker, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import * as nodemailer from 'nodemailer';
import { prisma, Prisma } from '@gnevo/db';
import { chatComplete, resolveProviderFromEnv } from '@gnevo/ai';
import { QUEUE_NAMES } from './queues.js';
import { renderBrandedEmail, automationEmailRows } from './email-template.js';

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface AutomationJob {
  runId: string;
  automationId: string;
  organizationId: string;
}

interface ActionStep {
  type: string;
  config: string;
}

/**
 * Automation worker: executes an AutomationRun's action steps and records the
 * outcome. `webhook` fires a real HTTP POST; other action types are recorded
 * (their real integrations land in later sprints — email/AI/etc.).
 */
const automationWorker = new Worker<AutomationJob>(
  'automation',
  async (job) => {
    const { runId, automationId } = job.data;
    const automation = await prisma.automation.findUnique({ where: { id: automationId } });
    const run = await prisma.automationRun.findUnique({ where: { id: runId } });
    if (!automation || !run) return;

    // Wait-for-event timeout: expire the run if it's still waiting.
    if (job.name === 'expire') {
      if (run.status === 'waiting') {
        await prisma.automationRun.update({
          where: { id: runId },
          data: { status: 'expired', finishedAt: new Date() },
        });
      }
      return;
    }

    // Unwrap the event: waiting/resumed runs nest it under `event`.
    const rawCtx = (run.context ?? {}) as Record<string, unknown>;
    const event = ((rawCtx.event as Record<string, unknown>) ?? rawCtx) as Record<string, unknown>;
    const subject = String(event.name ?? event.title ?? 'a record');
    const eventLabel = automation.triggerType.replace(/[._]/g, ' ');

    const def = (automation.definition ?? {}) as { actions?: ActionStep[] };
    const results: { type: string; ok: boolean; note?: string; output?: string }[] = [];

    for (const action of def.actions ?? []) {
      try {
        if (action.type === 'webhook' && action.config?.startsWith('http')) {
          await fetch(action.config, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ automation: automation.name, event }),
          });
          results.push({ type: action.type, ok: true });
        } else if (action.type === 'ai_generate') {
          const resolved = resolveProviderFromEnv(process.env);
          if (!resolved) {
            results.push({ type: action.type, ok: false, note: 'No AI key configured' });
          } else {
            const prompt =
              action.config?.trim() ||
              `A CRM event "${eventLabel}" just occurred for "${subject}". ` +
                `Write a concise, ready-to-use internal follow-up note (2–4 sentences) for the account manager. ` +
                `Do NOT use placeholders like [Name], and do NOT mention IDs or system fields.`;
            const output = await chatComplete({
              provider: resolved.provider,
              apiKey: resolved.apiKey,
              messages: [{ role: 'user', content: prompt }],
            });
            results.push({ type: action.type, ok: true, output });
          }
        } else if (action.type === 'send_email') {
          const to = (action.config ?? '').trim();
          if (!to.includes('@')) {
            results.push({ type: action.type, ok: false, note: 'Put the recipient email in the action config' });
          } else {
            const org = await prisma.organization.findUnique({
              where: { id: automation.organizationId },
              select: { name: true, settings: true },
            });
            const brand = ((org?.settings as Record<string, unknown>)?.branding ?? {}) as {
              displayName?: string;
              brandColor?: string;
            };
            const brandName = brand.displayName || org?.name || 'Gnevo CRM';
            const appUrl = process.env.WEB_URL || 'http://localhost:3000';
            const heading = eventLabel.replace(/\b\w/g, (c) => c.toUpperCase());
            const html = renderBrandedEmail({
              brandName,
              brandColor: brand.brandColor ?? null,
              heading,
              intro: `Your automation “${automation.name}” just ran in ${brandName}.`,
              rows: automationEmailRows(event),
              ctaText: `Open ${brandName}`,
              ctaUrl: appUrl,
              footerNote: `You’re receiving this because the “${automation.name}” automation is active in ${brandName}.`,
            });
            const sent = await sendMail(
              to,
              `${brandName}: ${heading} — ${subject}`,
              `Your automation "${automation.name}" ran.\n\nEvent: ${eventLabel}\nRecord: ${subject}\n\nOpen ${brandName}: ${appUrl}`,
              html,
            );
            results.push({ type: action.type, ok: sent, note: sent ? undefined : 'SMTP not configured or the send failed' });
          }
        } else {
          // send_notification / create_task / assign_owner: recorded for now.
          results.push({ type: action.type, ok: true, note: 'recorded' });
        }
      } catch (err) {
        results.push({ type: action.type, ok: false, note: (err as Error).message });
      }
    }

    await prisma.automationRun.update({
      where: { id: runId },
      data: {
        status: 'success',
        finishedAt: new Date(),
        context: { event, results } as unknown as Prisma.InputJsonValue,
      },
    });
  },
  { connection, concurrency: 5 },
);

/**
 * Scheduled worker: runs a daily job that snapshots every keyword's current
 * metrics into keyword_snapshots, building rank-tracking history over time.
 */
async function sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  if (!host) return false;
  try {
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'no-reply@gnevo.crm',
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });
    return true;
  } catch {
    return false;
  }
}

async function emailWeeklyReports(): Promise<void> {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, settings: true } });
  for (const org of orgs) {
    const sr = (org.settings as Record<string, unknown> | null)?.scheduledReports as
      | { enabled?: boolean }
      | undefined;
    if (!sr?.enabled) continue;

    const [leads, customers, deals, invoices, openTasks] = await Promise.all([
      prisma.lead.count({ where: { organizationId: org.id, deletedAt: null } }),
      prisma.customer.count({ where: { organizationId: org.id, deletedAt: null } }),
      prisma.deal.findMany({
        where: { organizationId: org.id, deletedAt: null, status: 'open' },
        select: { value: true },
      }),
      prisma.invoice.findMany({
        where: { organizationId: org.id, deletedAt: null, status: 'paid' },
        select: { lines: { select: { quantity: true, unitPrice: true } } },
      }),
      prisma.task.count({ where: { organizationId: org.id, deletedAt: null, status: { not: 'done' } } }),
    ]);
    const forecast = deals.reduce((s, d) => s + Number(d.value), 0);
    const paid = invoices.reduce(
      (s, i) => s + i.lines.reduce((x, l) => x + l.quantity * Number(l.unitPrice), 0),
      0,
    );
    const summary =
      `Weekly summary for ${org.name}\n\n` +
      `• Leads: ${leads}\n• Customers: ${customers}\n` +
      `• Open pipeline value: ${forecast}\n• Paid revenue: ${paid}\n• Open tasks: ${openTasks}\n`;

    const recipients = await prisma.user.findMany({
      where: {
        organizationId: org.id,
        deletedAt: null,
        roles: { some: { role: { key: { in: ['owner', 'admin'] } } } },
      },
      select: { email: true },
    });
    for (const r of recipients) {
      const sent = await sendMail(r.email, `Gnevo CRM — weekly report (${org.name})`, summary);
      if (!sent) {
        // eslint-disable-next-line no-console
        console.log(`\n📊 [dev] Weekly report for ${r.email}:\n${summary}`);
      }
    }
  }
}

const scheduledQueue = new Queue('scheduled', { connection });
const scheduledWorker = new Worker(
  'scheduled',
  async (job) => {
    if (job.name === 'snapshot-keywords') {
      const keywords = await prisma.keyword.findMany({
        select: { id: true, organizationId: true, position: true, clicks: true, impressions: true },
      });
      if (keywords.length > 0) {
        await prisma.keywordSnapshot.createMany({
          data: keywords.map((k) => ({
            organizationId: k.organizationId,
            keywordId: k.id,
            position: k.position,
            clicks: k.clicks,
            impressions: k.impressions,
          })),
        });
      }
      // eslint-disable-next-line no-console
      console.log(`[scheduled] snapshotted ${keywords.length} keyword(s)`);
    } else if (job.name === 'email-reports') {
      await emailWeeklyReports();
    } else if (job.name === 'snapshot-clients') {
      await captureClientSnapshots();
    }
  },
  { connection },
);

/** Weekly automated client health snapshots for trend history. */
async function captureClientSnapshots() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      organizationId: true,
      status: true,
      deals: { where: { deletedAt: null }, select: { value: true, status: true } },
      invoices: {
        where: { deletedAt: null },
        select: { status: true, lines: { select: { quantity: true, unitPrice: true } } },
      },
      tickets: { where: { deletedAt: null }, select: { status: true } },
      projects: { where: { deletedAt: null }, select: { status: true } },
    },
  });
  const invTotal = (lines: { quantity: number; unitPrice: Prisma.Decimal }[]) =>
    lines.reduce((s, l) => s + l.quantity * Number(l.unitPrice), 0);

  const rows = customers.map((c) => {
    const openDealsArr = c.deals.filter((d) => d.status === 'open');
    const openDealsValue = openDealsArr.reduce((s, d) => s + Number(d.value), 0);
    const wonValue = c.deals.filter((d) => d.status === 'won').reduce((s, d) => s + Number(d.value), 0);
    const paidRevenue = c.invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + invTotal(i.lines), 0);
    const outstanding = c.invoices
      .filter((i) => !['paid', 'void', 'draft'].includes(i.status))
      .reduce((s, i) => s + invTotal(i.lines), 0);
    const openTickets = c.tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length;
    const openProjects = c.projects.filter((p) => p.status === 'active').length;

    let score = 60;
    if (paidRevenue > 0) score += 15;
    if (wonValue > 0) score += 10;
    if (openDealsArr.length > 0) score += 5;
    if (openProjects > 0) score += 5;
    score -= Math.min(openTickets * 5, 20);
    if (outstanding > 0) score -= 10;
    if (c.status !== 'active') score -= 20;
    score = Math.max(0, Math.min(100, score));

    return {
      organizationId: c.organizationId,
      customerId: c.id,
      openDeals: openDealsArr.length,
      openDealsValue,
      wonValue,
      paidRevenue,
      outstanding,
      openTickets,
      openProjects,
      healthScore: score,
    };
  });
  if (rows.length) await prisma.clientSnapshot.createMany({ data: rows });
  // eslint-disable-next-line no-console
  console.log(`[scheduled] captured ${rows.length} client snapshot(s)`);
}

// Register the daily snapshot (02:00) + weekly report email (Mon 08:00).
void scheduledQueue.add(
  'snapshot-keywords',
  {},
  { repeat: { pattern: '0 2 * * *' }, jobId: 'daily-keyword-snapshot', removeOnComplete: true },
);
void scheduledQueue.add(
  'email-reports',
  {},
  { repeat: { pattern: '0 8 * * 1' }, jobId: 'weekly-report-email', removeOnComplete: true },
);
// Weekly client health snapshot (Mon 03:00).
void scheduledQueue.add(
  'snapshot-clients',
  {},
  { repeat: { pattern: '0 3 * * 1' }, jobId: 'weekly-client-snapshot', removeOnComplete: true },
);

/**
 * Webhook delivery worker: signs + POSTs the payload, records a delivery row
 * per attempt, and lets BullMQ retry with exponential backoff on failure.
 */
interface WebhookJob {
  organizationId: string;
  webhookId: string;
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}
const webhooksWorker = new Worker<WebhookJob>(
  'webhooks',
  async (job) => {
    const { organizationId, webhookId, event, timestamp, data } = job.data;
    const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: webhookId } });
    if (!endpoint || !endpoint.active) return;

    const payload = JSON.stringify({ event, data, timestamp });
    const signature = createHmac('sha256', endpoint.secret).update(payload).digest('hex');
    const attempt = job.attemptsMade + 1;

    const started = Date.now();
    let statusCode: number | null = null;
    let ok = false;
    let responseBody = '';
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-gnevo-event': event,
          'x-gnevo-signature': `sha256=${signature}`,
          'x-gnevo-delivery-attempt': String(attempt),
        },
        body: payload,
        signal: controller.signal,
      }).finally(() => clearTimeout(t));
      statusCode = res.status;
      ok = res.ok;
      responseBody = (await res.text().catch(() => '')).slice(0, 2000);
    } catch (err) {
      responseBody = (err as Error).message.slice(0, 2000);
    }
    const responseTimeMs = Date.now() - started;

    await prisma.webhookDelivery.create({
      data: { organizationId, webhookId, event, statusCode, ok, responseTimeMs, responseBody, attempt },
    });
    await prisma.webhookEndpoint.update({
      where: { id: webhookId },
      data: {
        lastStatus: statusCode ?? 0,
        lastFiredAt: new Date(),
        ...(ok ? { failureCount: 0 } : {}),
      },
    });

    if (!ok) throw new Error(`Webhook delivery failed (status ${statusCode ?? 'network error'})`);
  },
  { connection, concurrency: 5 },
);

webhooksWorker.on('failed', (job) => {
  // Final attempt exhausted → bump the endpoint's failure counter.
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    void prisma.webhookEndpoint
      .update({ where: { id: job.data.webhookId }, data: { failureCount: { increment: 1 } } })
      .catch(() => undefined);
  }
});

automationWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[automation] run ${job?.data?.runId ?? '?'} failed:`, err.message);
  if (job?.data?.runId) {
    void prisma.automationRun
      .update({
        where: { id: job.data.runId },
        data: { status: 'failed', error: err.message, finishedAt: new Date() },
      })
      .catch(() => undefined);
  }
});

// eslint-disable-next-line no-console
console.log(`👷 Workers online. Queues: ${QUEUE_NAMES.join(', ')}`);

async function shutdown() {
  await automationWorker.close();
  await webhooksWorker.close();
  await scheduledWorker.close();
  await scheduledQueue.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
