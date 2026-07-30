import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient, tenantClient, type TenantPrismaClient } from '@gnevo/db';

/**
 * Wraps the shared PrismaClient with Nest lifecycle hooks and exposes a
 * tenant-scoped client factory. All tenant data access goes through
 * `forTenant(orgId)` so `organizationId` is injected automatically
 * (application-layer isolation; Postgres RLS is the DB-layer backstop).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  forTenant(organizationId: string): TenantPrismaClient {
    return tenantClient(this, organizationId);
  }
}
