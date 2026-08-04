import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@gnevo/db';
import { PrismaService } from '../../prisma/prisma.service.js';
import { QueueService } from '../../queue/queue.service.js';
import { WebhooksService } from '../webhooks/webhooks.service.js';
import { IntegrationsService } from '../integrations/integrations.service.js';
import { MailerService } from '../../common/mailer.service.js';
import { NotificationsService } from '../events/notifications.service.js';
import { renderBrandedEmail, automationEmailRows } from '../../common/email-template.js';

/**
 * Fires automations for a domain event: finds active automations matching the
 * trigger, creates an AutomationRun, and enqueues it for the worker to execute.
 * Failures here (e.g. Redis down) must NEVER break the domain operation.
 */
@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly webhooks: WebhooksService,
    private readonly integrations: IntegrationsService,
    private readonly mailer: MailerService,
    private readonly notifications: NotificationsService,
  ) {}

  async trigger(
    organizationId: string,
    triggerType: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    // Outbound platform webhooks — fire-and-forget for every domain event.
    this.webhooks.dispatch(organizationId, triggerType, context);
    // Outbound Slack/Telegram notifications — fire-and-forget.
    this.integrations.dispatch(organizationId, triggerType, context);

    try {
      const db = this.prisma.forTenant(organizationId);

      // First, resume any waiting runs whose wait-for event this trigger matches.
      await this.resumeWaiting(db, organizationId, triggerType, context);

      const automations = await db.automation.findMany({
        where: { triggerType, isActive: true, deletedAt: null },
      });
      for (const automation of automations) {
        const def = (automation.definition ?? {}) as {
          condition?: AutomationCondition;
          delaySeconds?: number;
          waitFor?: { triggerType: string; withinSeconds?: number };
        };

        // IF/ELSE: skip automations whose condition isn't met (recorded so the
        // run inspector shows it was evaluated and skipped).
        if (def.condition && !this.evaluateCondition(def.condition, context)) {
          await db.automationRun.create({
            data: {
              organizationId,
              automationId: automation.id,
              status: 'skipped',
              context: {
                event: context,
                note: 'Condition not met',
              } as unknown as Prisma.InputJsonValue,
              finishedAt: new Date(),
            },
          });
          continue;
        }

        // Wait-for-event: park the run as 'waiting' until the second event
        // fires for the same record; schedule a timeout that expires it.
        if (def.waitFor?.triggerType) {
          const waitRun = await db.automationRun.create({
            data: {
              organizationId,
              automationId: automation.id,
              status: 'waiting',
              context: {
                event: context,
                matchKey: this.matchKey(context),
                waitFor: def.waitFor,
              } as unknown as Prisma.InputJsonValue,
            },
          });
          const withinMs = Math.max(60_000, (def.waitFor.withinSeconds ?? 86_400) * 1000);
          await this.queue.automation.add(
            'expire',
            { runId: waitRun.id, automationId: automation.id, organizationId },
            { delay: withinMs, removeOnComplete: true, removeOnFail: 100 },
          );
          continue;
        }

        const run = await db.automationRun.create({
          data: {
            organizationId,
            automationId: automation.id,
            status: 'pending',
            context: context as unknown as Prisma.InputJsonValue,
          },
        });

        const delayMs = Math.max(0, Math.floor((def.delaySeconds ?? 0) * 1000));
        if (delayMs > 0) {
          // Delayed → hand off to the Workers service (BullMQ) to run later.
          await this.queue.automation.add(
            'run',
            { runId: run.id, automationId: automation.id, organizationId },
            { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true, removeOnFail: 100, delay: delayMs },
          );
        } else {
          // Immediate → run the actions right now, inline, so automations work
          // even without a separate Workers service. Fire-and-forget so the
          // domain operation that triggered this isn't blocked (e.g. on SMTP).
          void this.runActionsInline(db, automation, run.id, organizationId, context).catch((e) =>
            this.logger.error(`Inline automation run ${run.id} failed`, e as Error),
          );
        }
      }
    } catch (err) {
      this.logger.error(`Automation trigger '${triggerType}' failed`, err as Error);
    }
  }

  /**
   * Execute an automation's actions immediately (no worker needed). Handles
   * send_email, send_notification and webhook; other action types are recorded
   * (they run on the Workers service when deployed). Records the outcome on the
   * AutomationRun so the run inspector shows what happened.
   */
  private async runActionsInline(
    db: ReturnType<PrismaService['forTenant']>,
    automation: { id: string; name: string; triggerType: string; definition: unknown },
    runId: string,
    organizationId: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    const def = (automation.definition ?? {}) as { actions?: { type: string; config?: string }[] };
    const eventLabel = automation.triggerType.replace(/[._]/g, ' ');
    const recordName = String(context.name ?? context.title ?? 'a record');
    const results: { type: string; ok: boolean; note?: string }[] = [];

    // Branding for the email (white-label): the workspace's name + accent color.
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, settings: true },
    });
    const brand = ((org?.settings as Record<string, unknown>)?.branding ?? {}) as {
      displayName?: string;
      brandColor?: string;
    };
    const brandName = brand.displayName || org?.name || 'Gnevo CRM';
    const brandColor = brand.brandColor ?? null;
    const appUrl = process.env.WEB_URL || 'http://localhost:3000';

    for (const action of def.actions ?? []) {
      try {
        if (action.type === 'send_email') {
          // config: "<recipient> | <optional custom message>". Recipient may be a
          // fixed email, or a token like {{email}} to email the record itself
          // (e.g. a welcome email to a new lead).
          const raw = (action.config ?? '').trim();
          const [recipientPart, ...msgParts] = raw.split('|');
          const to = this.interpolate((recipientPart ?? '').trim(), context);
          const customMsg = msgParts.join('|').trim();
          if (!to.includes('@')) {
            results.push({ type: action.type, ok: false, note: 'Config needs a recipient — a fixed email, or {{email}} to email the record' });
          } else {
            const emailedRecord = !!context.email && to.toLowerCase() === String(context.email).toLowerCase();
            const firstName = String(context.name ?? '').trim().split(' ')[0] || 'there';
            let subjectLine: string;
            let text: string;
            let html: string;
            if (emailedRecord) {
              // Warm, customer-facing welcome/thank-you email (no internal fields).
              const intro = customMsg || `Thank you for your interest in ${brandName}. We’ve received your details and a member of our team will be in touch with you shortly.`;
              subjectLine = `Welcome to ${brandName}, ${firstName}!`;
              text = `Hi ${firstName},\n\n${intro}\n\n— ${brandName}`;
              html = renderBrandedEmail({
                brandName,
                brandColor,
                heading: `Welcome, ${firstName}!`,
                intro,
                ctaText: `Visit ${brandName}`,
                ctaUrl: appUrl,
                footerNote: `This is an automated message from ${brandName}.`,
              });
            } else {
              // Internal notification email with the record's details.
              const heading = eventLabel.replace(/\b\w/g, (c) => c.toUpperCase());
              const intro = customMsg || `Your automation “${automation.name}” just ran in ${brandName}.`;
              subjectLine = `${brandName}: ${heading} — ${recordName}`;
              text = `${intro}\n\nEvent: ${eventLabel}\nRecord: ${recordName}\n\nOpen ${brandName}: ${appUrl}`;
              html = renderBrandedEmail({
                brandName,
                brandColor,
                heading,
                intro,
                rows: automationEmailRows(context),
                ctaText: `Open ${brandName}`,
                ctaUrl: appUrl,
                footerNote: `You’re receiving this because the “${automation.name}” automation is active in ${brandName}.`,
              });
            }
            const sent = await this.mailer.send(to, subjectLine, text, html);
            results.push({ type: action.type, ok: sent, note: sent ? undefined : 'SMTP not configured or the send failed' });
          }
        } else if (action.type === 'send_notification') {
          // config (optional) = email of the person to notify; blank = the
          // record's owner/assignee. The notification lands in their bell.
          const wanted = (action.config ?? '').trim().toLowerCase();
          let userId = '';
          if (wanted.includes('@')) {
            const target = await this.prisma.user.findFirst({
              where: { organizationId, email: wanted, deletedAt: null },
              select: { id: true },
            });
            userId = target?.id ?? '';
          } else {
            userId = String(context.ownerId ?? context.assigneeId ?? '');
          }
          if (!userId) {
            results.push({
              type: action.type,
              ok: false,
              note: wanted ? 'No user in this workspace with that email' : 'No owner on the record — put a recipient email in the action config',
            });
          } else {
            await this.notifications.notify(organizationId, userId, {
              title: `${eventLabel.replace(/\b\w/g, (c) => c.toUpperCase())}`,
              body: recordName,
              link: this.recordLink(context),
              type: 'automation',
            });
            results.push({ type: action.type, ok: true });
          }
        } else if (action.type === 'webhook' && action.config?.startsWith('http')) {
          await fetch(action.config, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ automation: automation.name, event: context }),
          });
          results.push({ type: action.type, ok: true });
        } else if (action.type === 'create_task') {
          const title = this.interpolate((action.config ?? '').trim(), context) || `Follow up: ${recordName}`;
          const assigneeId = String(context.ownerId ?? context.assigneeId ?? '') || null;
          await db.task.create({
            data: { organizationId, title, status: 'todo', priority: 'medium', assigneeId },
          });
          results.push({ type: action.type, ok: true });
        } else if (action.type === 'assign_owner') {
          const wanted = this.interpolate((action.config ?? '').trim(), context).toLowerCase();
          if (!wanted.includes('@')) {
            results.push({ type: action.type, ok: false, note: 'Set the new owner’s email in the config' });
          } else {
            const target = await this.prisma.user.findFirst({
              where: { organizationId, email: wanted, deletedAt: null },
              select: { id: true },
            });
            if (!target) {
              results.push({ type: action.type, ok: false, note: 'No user in this workspace with that email' });
            } else if (context.leadId) {
              await db.lead.update({ where: { id: String(context.leadId) }, data: { ownerId: target.id } });
              results.push({ type: action.type, ok: true });
            } else if (context.customerId) {
              await db.customer.update({ where: { id: String(context.customerId) }, data: { ownerId: target.id } });
              results.push({ type: action.type, ok: true });
            } else if (context.dealId) {
              await db.deal.update({ where: { id: String(context.dealId) }, data: { ownerId: target.id } });
              results.push({ type: action.type, ok: true });
            } else {
              results.push({ type: action.type, ok: false, note: 'No lead/customer/deal on this event to reassign' });
            }
          }
        } else if (action.type === 'ai_generate') {
          results.push({ type: action.type, ok: true, note: 'AI actions run on the Workers service' });
        } else {
          results.push({ type: action.type, ok: true, note: 'recorded' });
        }
      } catch (err) {
        results.push({ type: action.type, ok: false, note: (err as Error).message });
      }
    }

    await db.automationRun.update({
      where: { id: runId },
      data: {
        status: 'success',
        finishedAt: new Date(),
        context: { event: context, results } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /** Replace {{field}} tokens in a string with values from the event context. */
  private interpolate(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
      const v = context[key];
      return v === undefined || v === null ? '' : String(v);
    });
  }

  /** An in-app link to the record an event is about (for notifications). */
  private recordLink(context: Record<string, unknown>): string | undefined {
    if (context.leadId) return `/leads/${context.leadId}`;
    if (context.customerId) return `/customers/${context.customerId}`;
    if (context.ticketId) return `/tickets/${context.ticketId}`;
    if (context.dealId) return `/deals`;
    return undefined;
  }

  /** The record id an event is about — used to correlate wait-for-event runs. */
  private matchKey(context: Record<string, unknown>): string {
    const c = context as Record<string, unknown>;
    return String(
      c.customerId ?? c.leadId ?? c.dealId ?? c.taskId ?? c.ticketId ?? c.id ?? '',
    );
  }

  /** Resume waiting runs whose wait-for event matches this trigger + record. */
  private async resumeWaiting(
    db: ReturnType<PrismaService['forTenant']>,
    organizationId: string,
    triggerType: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    const key = this.matchKey(context);
    if (!key) return;
    const waiting = await db.automationRun.findMany({
      where: { status: 'waiting' },
      include: { automation: true },
    });
    for (const run of waiting) {
      const runCtx = (run.context ?? {}) as { matchKey?: string; waitFor?: { triggerType?: string } };
      if (runCtx.waitFor?.triggerType !== triggerType || runCtx.matchKey !== key) continue;
      await db.automationRun.update({
        where: { id: run.id },
        data: {
          status: 'pending',
          context: { ...runCtx, resumedBy: context } as unknown as Prisma.InputJsonValue,
        },
      });
      await this.queue.automation.add(
        'run',
        { runId: run.id, automationId: run.automationId, organizationId },
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true, removeOnFail: 100 },
      );
    }
  }

  /** Evaluate a single IF condition against the event context. */
  private evaluateCondition(cond: AutomationCondition, context: Record<string, unknown>): boolean {
    const raw = context[cond.field];
    const actual = raw === undefined || raw === null ? '' : String(raw).toLowerCase();
    const expected = (cond.value ?? '').toLowerCase();
    switch (cond.operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return actual.includes(expected);
      case 'exists':
        return raw !== undefined && raw !== null && String(raw).length > 0;
      case 'not_exists':
        return raw === undefined || raw === null || String(raw).length === 0;
      default:
        return true;
    }
  }
}

interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'exists' | 'not_exists';
  value?: string;
}
