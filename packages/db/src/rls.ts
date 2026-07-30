import type { PrismaClient } from '@prisma/client';

/**
 * Row-Level Security helpers.
 *
 * The RLS policies (see the RLS migration) gate every tenant table on the
 * session GUC `app.current_org`. Application code must set it on the active
 * connection before querying. Because connection pooling means we can't rely on
 * a long-lived `SET`, we set it as a `LOCAL` inside an interactive transaction.
 */
export const RLS_GUC = 'app.current_org';

/**
 * Run `fn` inside a transaction with the tenant GUC set, so Postgres RLS
 * enforces `organization_id = app.current_org` on every statement.
 */
export async function withTenantRls<T>(
  prisma: PrismaClient,
  organizationId: string,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Parameterized set_config avoids any injection risk.
    await tx.$executeRawUnsafe(
      `SELECT set_config('${RLS_GUC}', $1, true)`,
      organizationId,
    );
    return fn(tx as unknown as PrismaClient);
  });
}
