import { BadRequestException } from '@nestjs/common';
import { chatComplete, resolveProviderFromEnv, type AiProvider, type ChatMessage } from '@gnevo/ai';
import type { PrismaService } from '../prisma/prisma.service.js';

/**
 * Run a chat completion using the workspace's preferred AI provider
 * (org.settings.ai) falling back to the first configured env key.
 * Throws a clear 400 when no provider is available.
 */
export async function orgChat(
  prisma: PrismaService,
  organizationId: string,
  messages: ChatMessage[],
): Promise<string> {
  const orgRow = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  const aiPref = ((orgRow?.settings as Record<string, unknown>)?.ai ?? {}) as {
    provider?: AiProvider;
    model?: string;
  };
  const resolved = resolveProviderFromEnv(process.env, aiPref.provider);
  if (!resolved) {
    throw new BadRequestException({
      title: 'No AI provider configured',
      message: 'Add an AI API key to .env (see docs/23-service-setup.md).',
    });
  }
  return chatComplete({
    provider: resolved.provider,
    apiKey: resolved.apiKey,
    model: aiPref.model,
    messages,
  });
}
