import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@gnevo/db';
import { PrismaService } from '../../prisma/prisma.service.js';

interface SlackCfg { webhookUrl?: string; events?: string[]; enabled?: boolean }
interface TelegramCfg { botToken?: string; chatId?: string; events?: string[]; enabled?: boolean }
interface GithubCfg { token?: string; repo?: string; enabled?: boolean }
interface JiraCfg { domain?: string; email?: string; token?: string; projectKey?: string; enabled?: boolean }
interface IntegrationsCfg {
  slack?: SlackCfg;
  telegram?: TelegramCfg;
  github?: GithubCfg;
  jira?: JiraCfg;
}

const EVENT_LABELS: Record<string, string> = {
  'lead.created': 'New lead',
  'customer.created': 'New customer',
  'deal.created': 'New deal',
  'deal.stage_changed': 'Deal stage changed',
  'ticket.created': 'New ticket',
  'invoice.paid': 'Invoice paid',
};
export const INTEGRATION_EVENTS = Object.keys(EVENT_LABELS);

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async raw(organizationId: string): Promise<IntegrationsCfg> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    return ((org?.settings as Record<string, unknown>)?.integrations ?? {}) as IntegrationsCfg;
  }

  /** Masked config for the settings UI — never returns raw secrets. */
  async getConfig(organizationId: string) {
    const c = await this.raw(organizationId);
    return {
      slack: { configured: !!c.slack?.webhookUrl, events: c.slack?.events ?? [], enabled: !!c.slack?.enabled },
      telegram: {
        configured: !!c.telegram?.botToken,
        chatId: c.telegram?.chatId ?? '',
        events: c.telegram?.events ?? [],
        enabled: !!c.telegram?.enabled,
      },
      github: { configured: !!c.github?.token, repo: c.github?.repo ?? '', enabled: !!c.github?.enabled },
      jira: {
        configured: !!c.jira?.token,
        domain: c.jira?.domain ?? '',
        email: c.jira?.email ?? '',
        projectKey: c.jira?.projectKey ?? '',
        enabled: !!c.jira?.enabled,
      },
      availableEvents: INTEGRATION_EVENTS.map((e) => ({ value: e, label: EVENT_LABELS[e] })),
    };
  }

  /** Merge patch into stored config; blank secret fields keep the existing value. */
  async updateConfig(organizationId: string, patch: IntegrationsCfg) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    const current = (settings.integrations ?? {}) as IntegrationsCfg;
    const keepSecret = (next: string | undefined, prev: string | undefined) =>
      next && next.trim() ? next.trim() : prev;

    const merged: IntegrationsCfg = {
      slack: {
        webhookUrl: keepSecret(patch.slack?.webhookUrl, current.slack?.webhookUrl),
        events: patch.slack?.events ?? current.slack?.events ?? [],
        enabled: patch.slack?.enabled ?? current.slack?.enabled ?? false,
      },
      telegram: {
        botToken: keepSecret(patch.telegram?.botToken, current.telegram?.botToken),
        chatId: patch.telegram?.chatId ?? current.telegram?.chatId,
        events: patch.telegram?.events ?? current.telegram?.events ?? [],
        enabled: patch.telegram?.enabled ?? current.telegram?.enabled ?? false,
      },
      github: {
        token: keepSecret(patch.github?.token, current.github?.token),
        repo: patch.github?.repo ?? current.github?.repo,
        enabled: patch.github?.enabled ?? current.github?.enabled ?? false,
      },
      jira: {
        domain: patch.jira?.domain ?? current.jira?.domain,
        email: patch.jira?.email ?? current.jira?.email,
        token: keepSecret(patch.jira?.token, current.jira?.token),
        projectKey: patch.jira?.projectKey ?? current.jira?.projectKey,
        enabled: patch.jira?.enabled ?? current.jira?.enabled ?? false,
      },
    };
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: { ...settings, integrations: merged } as unknown as Prisma.InputJsonValue },
    });
    return this.getConfig(organizationId);
  }

  private async postSlack(webhookUrl: string, text: string) {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`Slack responded ${res.status}`);
  }

  private async postTelegram(botToken: string, chatId: string, text: string) {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { description?: string };
      throw new Error(`Telegram: ${body.description ?? res.status}`);
    }
  }

  /** Send a test message for a provider (surfaces the real error to the user). */
  async test(organizationId: string, provider: string): Promise<{ ok: true }> {
    const c = await this.raw(organizationId);
    const msg = '✅ Gnevo CRM test message — your integration is connected.';
    try {
      if (provider === 'slack') {
        if (!c.slack?.webhookUrl) throw new Error('Add a Slack webhook URL first');
        await this.postSlack(c.slack.webhookUrl, msg);
      } else if (provider === 'telegram') {
        if (!c.telegram?.botToken || !c.telegram?.chatId) throw new Error('Add a bot token and chat ID first');
        await this.postTelegram(c.telegram.botToken, c.telegram.chatId, msg);
      } else {
        throw new Error('Unknown provider');
      }
    } catch (e) {
      throw new BadRequestException({ title: 'Test failed', message: (e as Error).message });
    }
    return { ok: true };
  }

  /** Fire-and-forget outbound notification for a domain event. */
  dispatch(organizationId: string, event: string, context: Record<string, unknown>): void {
    void (async () => {
      try {
        const c = await this.raw(organizationId);
        const label = EVENT_LABELS[event] ?? event;
        const name =
          (context.name as string) ||
          (context.title as string) ||
          (context.subject as string) ||
          (context.number as string) ||
          '';
        const text = `🔔 *${label}*${name ? `: ${name}` : ''}`;

        if (c.slack?.enabled && c.slack.webhookUrl && (c.slack.events ?? []).includes(event)) {
          await this.postSlack(c.slack.webhookUrl, text).catch((e) => this.logger.warn(`Slack: ${e}`));
        }
        if (
          c.telegram?.enabled &&
          c.telegram.botToken &&
          c.telegram.chatId &&
          (c.telegram.events ?? []).includes(event)
        ) {
          await this.postTelegram(c.telegram.botToken, c.telegram.chatId, `${label}${name ? `: ${name}` : ''}`).catch(
            (e) => this.logger.warn(`Telegram: ${e}`),
          );
        }
      } catch (e) {
        this.logger.warn(`Outbound dispatch failed: ${e}`);
      }
    })();
  }

  /** Create an issue in GitHub or Jira from a title + body. Returns the issue URL. */
  async createIssue(
    organizationId: string,
    provider: 'github' | 'jira',
    input: { title: string; body: string },
  ): Promise<{ url: string }> {
    const c = await this.raw(organizationId);
    try {
      if (provider === 'github') {
        const gh = c.github;
        if (!gh?.token || !gh.repo) throw new Error('Connect GitHub (token + repo) first');
        const res = await fetch(`https://api.github.com/repos/${gh.repo}/issues`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${gh.token}`,
            accept: 'application/vnd.github+json',
            'content-type': 'application/json',
            'user-agent': 'gnevo-crm',
          },
          body: JSON.stringify({ title: input.title, body: input.body }),
        });
        const data = (await res.json().catch(() => ({}))) as { html_url?: string; message?: string };
        if (!res.ok) throw new Error(data.message ?? `GitHub responded ${res.status}`);
        return { url: data.html_url ?? '' };
      }
      // Jira
      const jira = c.jira;
      if (!jira?.token || !jira.domain || !jira.email || !jira.projectKey) {
        throw new Error('Connect Jira (domain, email, token, project key) first');
      }
      const auth = Buffer.from(`${jira.email}:${jira.token}`).toString('base64');
      const domain = jira.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const res = await fetch(`https://${domain}/rest/api/3/issue`, {
        method: 'POST',
        headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          fields: {
            project: { key: jira.projectKey },
            summary: input.title,
            issuetype: { name: 'Task' },
            description: {
              type: 'doc',
              version: 1,
              content: [{ type: 'paragraph', content: [{ type: 'text', text: input.body || input.title }] }],
            },
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { key?: string; errorMessages?: string[] };
      if (!res.ok) throw new Error(data.errorMessages?.join(', ') ?? `Jira responded ${res.status}`);
      return { url: `https://${domain}/browse/${data.key}` };
    } catch (e) {
      throw new BadRequestException({ title: 'Could not create issue', message: (e as Error).message });
    }
  }
}
