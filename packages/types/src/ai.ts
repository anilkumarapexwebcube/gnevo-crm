import { z } from 'zod';

export const AiRoleSchema = z.enum(['system', 'user', 'assistant']);

export const AiMessageSchema = z.object({
  role: AiRoleSchema,
  content: z.string().min(1).max(8000),
});
export type AiMessage = z.infer<typeof AiMessageSchema>;

export const AiChatRequestSchema = z.object({
  messages: z.array(AiMessageSchema).min(1).max(50),
});
export type AiChatRequest = z.infer<typeof AiChatRequestSchema>;

export const AiChatResponseSchema = z.object({
  text: z.string(),
  provider: z.string(),
});
export type AiChatResponse = z.infer<typeof AiChatResponseSchema>;
