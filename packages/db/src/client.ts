import { PrismaClient } from '@prisma/client';

/**
 * Base Prisma client (singleton in dev to avoid connection storms on HMR).
 * Tenant isolation is enforced at two layers:
 *   1. Application: the tenant-scoped extension below injects `organizationId`.
 *   2. Database: Postgres RLS (see rls.ts + the RLS migration) is the backstop.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/** Models that carry `organizationId` and must always be tenant-scoped. */
export const TENANT_MODELS = new Set<string>([
  'Office',
  'Department',
  'Team',
  'User',
  'Role',
  'Lead',
  'Customer',
  'Contact',
  'Pipeline',
  'PipelineStage',
  'Deal',
  'Project',
  'Task',
  'Automation',
  'AutomationRun',
  'Invoice',
  'InvoiceLine',
  'SeoProject',
  'Keyword',
  'Ticket',
  'TicketMessage',
  'Article',
  'Announcement',
  'AuditLog',
  'Notification',
  'Activity',
  'FileAsset',
  'Passkey',
  'KeywordSnapshot',
  'Note',
  'ApiKey',
  'TimeEntry',
  'Milestone',
  'Competitor',
  'ContentItem',
  'WebhookEndpoint',
  'WebhookDelivery',
  'Macro',
  'ChatChannel',
  'ChatChannelMember',
  'ChatMessage',
  'CalendarEvent',
  'CalendarAttendee',
  'Embedding',
  'ClientSnapshot',
  'Invitation',
  'Attendance',
  'LeaveRequest',
  'Holiday',
]);

/**
 * Returns a client bound to a single tenant. Every read is filtered by
 * `organizationId` and every create has it injected — so application code
 * physically cannot address another tenant's rows. This complements (does not
 * replace) Postgres RLS.
 */
export function tenantClient(base: PrismaClient, organizationId: string) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.has(model)) {
            return query(args);
          }

          const a = args as Record<string, unknown>;

          // Inject tenant filter on reads/updates/deletes.
          if (
            operation.startsWith('find') ||
            operation === 'count' ||
            operation === 'aggregate' ||
            operation === 'groupBy' ||
            operation === 'updateMany' ||
            operation === 'deleteMany' ||
            operation === 'update' ||
            operation === 'delete'
          ) {
            a.where = { ...(a.where as object), organizationId };
          }

          // Inject tenant id on creates.
          if (operation === 'create') {
            a.data = { ...(a.data as object), organizationId };
          }
          if (operation === 'createMany') {
            const data = a.data as Record<string, unknown> | Record<string, unknown>[];
            a.data = Array.isArray(data)
              ? data.map((d) => ({ ...d, organizationId }))
              : { ...data, organizationId };
          }
          if (operation === 'upsert') {
            a.where = { ...(a.where as object), organizationId };
            a.create = { ...(a.create as object), organizationId };
          }

          return query(a);
        },
      },
    },
  });
}

export type TenantPrismaClient = ReturnType<typeof tenantClient>;
