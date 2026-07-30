/**
 * @gnevo/ai — provider-agnostic chat completion.
 * Stateless: callers pass the provider + apiKey (from env or workspace BYO-key).
 * Supports OpenAI-compatible APIs (OpenAI, OpenRouter, DeepSeek, xAI),
 * Google Gemini, and Anthropic Claude.
 */
export type AiProvider =
  | 'groq'
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'xai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompleteOptions {
  provider: AiProvider;
  apiKey: string;
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
}

interface ProviderConfig {
  baseUrl: string;
  defaultModel: string;
  shape: 'openai' | 'gemini' | 'anthropic';
}

export const PROVIDERS: Record<AiProvider, ProviderConfig> = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    shape: 'openai',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    shape: 'openai',
  },
  openai: { baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', shape: 'openai' },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    shape: 'openai',
  },
  xai: { baseUrl: 'https://api.x.ai/v1', defaultModel: 'grok-2-latest', shape: 'openai' },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-1.5-flash',
    shape: 'gemini',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-haiku-latest',
    shape: 'anthropic',
  },
};

/** Router priority: free/cheap first. */
const ENV_ROUTER: { env: string; provider: AiProvider }[] = [
  { env: 'GROQ_API_KEY', provider: 'groq' },
  { env: 'OPENROUTER_API_KEY', provider: 'openrouter' },
  { env: 'OPENAI_API_KEY', provider: 'openai' },
  { env: 'ANTHROPIC_API_KEY', provider: 'anthropic' },
  { env: 'GOOGLE_AI_API_KEY', provider: 'gemini' },
  { env: 'DEEPSEEK_API_KEY', provider: 'deepseek' },
  { env: 'XAI_API_KEY', provider: 'xai' },
];

/**
 * Pick a configured provider from an env-like object. If `preferred` is given
 * and its key is present, it wins; otherwise falls back to the router order.
 */
export function resolveProviderFromEnv(
  env: Record<string, string | undefined>,
  preferred?: AiProvider,
): { provider: AiProvider; apiKey: string } | null {
  if (preferred) {
    const entry = ENV_ROUTER.find((e) => e.provider === preferred);
    const key = entry ? env[entry.env] : undefined;
    if (key && key.trim()) return { provider: preferred, apiKey: key };
  }
  for (const entry of ENV_ROUTER) {
    const key = env[entry.env];
    if (key && key.trim()) return { provider: entry.provider, apiKey: key };
  }
  return null;
}

/* ─────────────────────────── Embeddings (RAG) ─────────────────────────── */

export type EmbeddingProvider = 'openai' | 'gemini';

const EMBEDDING_ENV: { env: string; provider: EmbeddingProvider }[] = [
  { env: 'OPENAI_API_KEY', provider: 'openai' },
  { env: 'GOOGLE_AI_API_KEY', provider: 'gemini' },
];

const EMBEDDING_MODEL: Record<EmbeddingProvider, string> = {
  openai: 'text-embedding-3-small',
  gemini: 'gemini-embedding-001',
};

/** Only OpenAI + Gemini expose embedding APIs; other chat providers do not. */
export function resolveEmbeddingProviderFromEnv(
  env: Record<string, string | undefined>,
): { provider: EmbeddingProvider; apiKey: string; model: string } | null {
  for (const entry of EMBEDDING_ENV) {
    const key = env[entry.env];
    if (key && key.trim()) {
      return { provider: entry.provider, apiKey: key, model: EMBEDDING_MODEL[entry.provider] };
    }
  }
  return null;
}

export interface EmbedOptions {
  provider: EmbeddingProvider;
  apiKey: string;
  model?: string;
  input: string[];
}

/** Returns one vector per input string, in order. */
export async function embed(opts: EmbedOptions): Promise<number[][]> {
  const model = opts.model ?? EMBEDDING_MODEL[opts.provider];
  if (opts.provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${opts.apiKey}` },
      body: JSON.stringify({ model, input: opts.input }),
    });
    if (!res.ok) throw new AiError(await safeError(res), res.status);
    const data = (await res.json()) as { data?: { embedding: number[] }[] };
    return (data.data ?? []).map((d) => d.embedding);
  }
  // Gemini batch embeddings
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${opts.apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requests: opts.input.map((text) => ({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        })),
      }),
    },
  );
  if (!res.ok) throw new AiError(await safeError(res), res.status);
  const data = (await res.json()) as { embeddings?: { values: number[] }[] };
  return (data.embeddings ?? []).map((e) => e.values);
}

/** Cosine similarity between two equal-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export async function chatComplete(opts: ChatCompleteOptions): Promise<string> {
  const cfg = PROVIDERS[opts.provider];
  const model = opts.model ?? cfg.defaultModel;
  if (cfg.shape === 'openai') return openaiChat(cfg, opts, model);
  if (cfg.shape === 'gemini') return geminiChat(cfg, opts, model);
  return anthropicChat(cfg, opts, model);
}

async function openaiChat(cfg: ProviderConfig, opts: ChatCompleteOptions, model: string) {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${opts.apiKey}` },
    body: JSON.stringify({ model, messages: opts.messages, temperature: opts.temperature ?? 0.7 }),
  });
  if (!res.ok) throw new AiError(await safeError(res), res.status);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

async function geminiChat(cfg: ProviderConfig, opts: ChatCompleteOptions, model: string) {
  const system = opts.messages.find((m) => m.role === 'system')?.content;
  const contents = opts.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const res = await fetch(
    `${cfg.baseUrl}/models/${model}:generateContent?key=${opts.apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents,
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      }),
    },
  );
  if (!res.ok) throw new AiError(await safeError(res), res.status);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
}

async function anthropicChat(cfg: ProviderConfig, opts: ChatCompleteOptions, model: string) {
  const system = opts.messages.find((m) => m.role === 'system')?.content;
  const messages = opts.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch(`${cfg.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: 1024, ...(system ? { system } : {}), messages }),
  });
  if (!res.ok) throw new AiError(await safeError(res), res.status);
  const data = (await res.json()) as { content?: { text?: string }[] };
  return data.content?.map((c) => c.text ?? '').join('') ?? '';
}

async function safeError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } | string };
    const msg = typeof body.error === 'string' ? body.error : body.error?.message;
    return msg ?? `AI request failed (${res.status})`;
  } catch {
    return `AI request failed (${res.status})`;
  }
}
