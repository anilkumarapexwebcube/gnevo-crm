/**
 * Queue registry. Each family gets its own queue so a slow job type can't
 * starve others (see docs/06-workflow-automation.md §6). Workers scale by
 * queue depth (KEDA) in production.
 */
export const QUEUE_NAMES = [
  'automation',
  'email',
  'sms',
  'whatsapp',
  'ai',
  'webhooks',
  'search-index',
  'reports',
  'exports',
  'imports',
  'scheduled',
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

/** Default job options: retries with exponential backoff + DLQ semantics. */
export const DEFAULT_JOB_OPTS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 24 * 3600 },
};
