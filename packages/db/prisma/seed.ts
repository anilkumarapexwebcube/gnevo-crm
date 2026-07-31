/**
 * Base seed — production-safe. Seeds only:
 *   1. Global permissions (resource × action) referenced by the role templates.
 *   2. The database RLS policies (rls.sql).
 *
 * There is NO demo organization, demo users, or sample data. A real workspace
 * and its Owner are created by the **Register** flow (auth.service.register),
 * which also upserts permissions and org roles — so this seed is optional but
 * handy to pre-warm permissions and apply RLS. Idempotent: safe to run
 * repeatedly, including against a production database.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { SYSTEM_ROLE_TEMPLATES } from '@gnevo/auth';

// Run via tsx from a CommonJS package, so __dirname is available.
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Gnevo CRM base data (permissions + RLS)...');

  // 1. Global permissions (resource × action).
  const resources = [
    ...new Set(
      Object.values(SYSTEM_ROLE_TEMPLATES)
        .flat()
        .map((p) => p.resource),
    ),
  ];
  const actions = ['view', 'create', 'update', 'delete', 'manage'] as const;
  for (const resource of resources) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: { resource, action },
      });
    }
  }

  // 2. Apply RLS policies (idempotent — safe to re-run).
  const rlsSql = readFileSync(join(__dirname, 'rls.sql'), 'utf8');
  await prisma.$executeRawUnsafe(rlsSql);

  console.log('✅ Seed complete: permissions + RLS applied. Create your workspace via Register.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
