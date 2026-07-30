/**
 * Dev seed: global permissions, a demo organization with system roles, and
 * demo users. Seeds data BEFORE enabling RLS, then applies rls.sql so local
 * dev mirrors production isolation.
 *
 * Demo login (dev only):
 *   owner@acme.test  / DemoPassw0rd!
 *   member@acme.test / DemoPassw0rd!
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { hashPassword, SYSTEM_ROLE_NAMES, SYSTEM_ROLE_TEMPLATES } from '@gnevo/auth';
import type { SystemRole } from '@gnevo/types';

// Run via tsx from a CommonJS package, so __dirname is available.
const prisma = new PrismaClient();

const DEMO_PASSWORD = 'DemoPassw0rd!';

async function main() {
  console.log('🌱 Seeding Gnevo CRM dev data...');

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
  const allPermissions = await prisma.permission.findMany();
  const permId = (resource: string, action: string) =>
    allPermissions.find((p) => p.resource === resource && p.action === action)!.id;

  // 2. Demo organization.
  const org = await prisma.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: { name: 'Acme Digital', slug: 'acme', plan: 'growth' },
  });

  // 3. Roles for the org from system templates.
  const roleIdByKey = new Map<string, string>();
  for (const key of Object.keys(SYSTEM_ROLE_TEMPLATES) as SystemRole[]) {
    const role = await prisma.role.upsert({
      where: { organizationId_key: { organizationId: org.id, key } },
      update: {},
      create: {
        organizationId: org.id,
        key,
        name: SYSTEM_ROLE_NAMES[key],
        isSystem: true,
      },
    });
    roleIdByKey.set(key, role.id);

    for (const tpl of SYSTEM_ROLE_TEMPLATES[key]) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permId(tpl.resource, tpl.action),
          },
        },
        update: { scope: tpl.scope },
        create: {
          roleId: role.id,
          permissionId: permId(tpl.resource, tpl.action),
          scope: tpl.scope,
        },
      });
    }
  }

  // 4. Demo users.
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const demoUsers: Array<{ email: string; fullName: string; role: SystemRole }> = [
    { email: 'owner@acme.test', fullName: 'Ava Owner', role: 'owner' },
    { email: 'member@acme.test', fullName: 'Milo Member', role: 'member' },
  ];
  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { organizationId_email: { organizationId: org.id, email: u.email } },
      update: {},
      create: {
        organizationId: org.id,
        email: u.email,
        fullName: u.fullName,
        passwordHash,
        status: 'active',
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roleIdByKey.get(u.role)! } },
      update: {},
      create: { userId: user.id, roleId: roleIdByKey.get(u.role)! },
    });
  }

  // 5. A few demo leads.
  const owner = await prisma.user.findFirst({
    where: { organizationId: org.id, email: 'owner@acme.test' },
  });
  const existingLeads = await prisma.lead.count({ where: { organizationId: org.id } });
  if (existingLeads === 0) {
    await prisma.lead.createMany({
      data: [
        { organizationId: org.id, name: 'Rahul Sharma', company: 'Globex', source: 'google_ads', status: 'new', score: 84, ownerId: owner?.id ?? null },
        { organizationId: org.id, name: 'Priya Nair', company: 'Initech', source: 'organic', status: 'qualified', score: 61, ownerId: owner?.id ?? null },
        { organizationId: org.id, name: 'Sam Wilson', company: 'Umbrella', source: 'referral', status: 'contacted', score: 47, ownerId: owner?.id ?? null },
      ],
    });
  }

  // 5b. Default sales pipeline with stages + demo deals.
  const existingPipeline = await prisma.pipeline.findFirst({
    where: { organizationId: org.id, isDefault: true },
  });
  if (!existingPipeline) {
    const pipeline = await prisma.pipeline.create({
      data: { organizationId: org.id, name: 'Sales', isDefault: true },
    });
    const stageNames = ['New', 'Qualified', 'Proposal', 'Won', 'Lost'];
    const stages = [];
    for (let i = 0; i < stageNames.length; i++) {
      stages.push(
        await prisma.pipelineStage.create({
          data: {
            organizationId: org.id,
            pipelineId: pipeline.id,
            name: stageNames[i]!,
            position: i,
          },
        }),
      );
    }
    await prisma.deal.createMany({
      data: [
        { organizationId: org.id, pipelineId: pipeline.id, stageId: stages[0]!.id, title: 'Globex retainer', value: 12000, ownerId: owner?.id ?? null },
        { organizationId: org.id, pipelineId: pipeline.id, stageId: stages[1]!.id, title: 'Initech SEO', value: 30000, probability: 60, ownerId: owner?.id ?? null },
        { organizationId: org.id, pipelineId: pipeline.id, stageId: stages[2]!.id, title: 'Umbrella PPC', value: 45000, probability: 75, ownerId: owner?.id ?? null },
        { organizationId: org.id, pipelineId: pipeline.id, stageId: stages[3]!.id, title: 'Acme website', value: 20000, status: 'won', ownerId: owner?.id ?? null },
      ],
    });
  }

  // 5c. Demo project + tasks.
  const existingProject = await prisma.project.findFirst({
    where: { organizationId: org.id },
  });
  if (!existingProject) {
    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: 'Acme SEO Retainer',
        description: 'Ongoing SEO + content delivery for Acme.',
        status: 'active',
        ownerId: owner?.id ?? null,
      },
    });
    await prisma.task.createMany({
      data: [
        { organizationId: org.id, projectId: project.id, title: 'Keyword research', status: 'done', priority: 'high', position: 0, assigneeId: owner?.id ?? null },
        { organizationId: org.id, projectId: project.id, title: 'On-page audit', status: 'in_progress', priority: 'high', position: 1, assigneeId: owner?.id ?? null },
        { organizationId: org.id, projectId: project.id, title: 'Publish 4 blog posts', status: 'todo', priority: 'medium', position: 2 },
        { organizationId: org.id, projectId: project.id, title: 'Backlink outreach', status: 'todo', priority: 'low', position: 3 },
      ],
    });
  }

  // 6. Apply RLS policies (after data exists).
  const rlsSql = readFileSync(join(__dirname, 'rls.sql'), 'utf8');
  await prisma.$executeRawUnsafe(rlsSql);

  console.log('✅ Seed complete. Demo org "acme"; login owner@acme.test / DemoPassw0rd!');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
