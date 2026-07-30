import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import type { Env } from '../config/config.schema.js';

/**
 * Owns the Redis connection + BullMQ queues used by the API as a job producer.
 * Workers (apps/workers) consume these queues.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection: Redis;
  readonly automation: Queue;
  readonly webhooks: Queue;

  constructor(config: ConfigService<Env, true>) {
    this.connection = new Redis(config.get('REDIS_URL', { infer: true }), {
      maxRetriesPerRequest: null,
    });
    this.automation = new Queue('automation', { connection: this.connection });
    this.webhooks = new Queue('webhooks', { connection: this.connection });
  }

  async onModuleDestroy(): Promise<void> {
    await this.automation.close();
    await this.webhooks.close();
    await this.connection.quit();
  }
}
