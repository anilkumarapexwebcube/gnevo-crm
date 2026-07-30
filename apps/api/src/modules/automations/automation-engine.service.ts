import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@gnevo/db';
import { PrismaService } from '../../prisma/prisma.service.js';
import { QueueService } from '../../queue/queue.service.js';
import { WebhooksService } from '../webhooks/webhooks.service.js';
import { IntegrationsService } from '../integrations/integrations.service.js';

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

        // Delay: schedule the job into the future when configured.
        const delayMs = Math.max(0, Math.floor((def.delaySeconds ?? 0) * 1000));
        await this.queue.automation.add(
          'run',
          { runId: run.id, automationId: automation.id, organizationId },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
            removeOnFail: 100,
            ...(delayMs > 0 ? { delay: delayMs } : {}),
          },
        );
      }
    } catch (err) {
      this.logger.error(`Automation trigger '${triggerType}' failed`, err as Error);
    }
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
