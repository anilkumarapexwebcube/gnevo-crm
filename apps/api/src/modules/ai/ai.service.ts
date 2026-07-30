import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiError,
  chatComplete,
  resolveProviderFromEnv,
  type AiProvider,
  type ChatMessage,
} from '@gnevo/ai';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Env } from '../../config/config.schema.js';

const SYSTEM_PROMPT =
  'You are Gnevo AI, an assistant inside a CRM for a digital marketing & SEO agency. ' +
  'Be concise, practical, and helpful with leads, deals, customers, projects, SEO, and content.';

@Injectable()
export class AiService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  /** The workspace's preferred provider/model, if set in org settings. */
  async aiPreference(
    organizationId: string,
  ): Promise<{ provider?: AiProvider; model?: string }> {
    try {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      });
      const ai = ((org?.settings as Record<string, unknown>)?.ai ?? {}) as {
        provider?: AiProvider;
        model?: string;
      };
      return { provider: ai.provider, model: ai.model };
    } catch {
      return {};
    }
  }

  async chat(
    organizationId: string,
    messages: ChatMessage[],
  ): Promise<{ text: string; provider: string }> {
    const pref = await this.aiPreference(organizationId);
    const resolved = resolveProviderFromEnv(process.env, pref.provider);
    if (!resolved) {
      throw new BadRequestException({
        title: 'No AI provider configured',
        message: 'Add an AI API key to .env (see docs/23-service-setup.md).',
      });
    }

    const withSystem: ChatMessage[] = messages.some((m) => m.role === 'system')
      ? messages
      : [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

    try {
      const text = await chatComplete({
        provider: resolved.provider,
        apiKey: resolved.apiKey,
        model: pref.model,
        messages: withSystem,
      });
      return { text, provider: resolved.provider };
    } catch (err) {
      if (err instanceof AiError) {
        throw new BadRequestException({ title: 'AI request failed', message: err.message });
      }
      throw err;
    }
  }
}
