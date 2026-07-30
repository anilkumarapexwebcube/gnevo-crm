import { BadRequestException } from '@nestjs/common';
import { SYSTEM_ROLE_NAMES, SYSTEM_ROLE_TEMPLATES } from '@gnevo/auth';
import type { SystemRole } from '@gnevo/types';
import type { PrismaService } from '../prisma/prisma.service.js';

/**
 * Return the id of an org's system role, creating it (with its permissions)
 * if the org was seeded before that role existed — e.g. the new `hr` role for
 * workspaces created earlier. Idempotent.
 */
export async function ensureSystemRole(
  prisma: PrismaService,
  organizationId: string,
  roleKey: string,
): Promise<string> {
  const existing = await prisma.role.findFirst({
    where: { organizationId, key: roleKey },
    select: { id: true },
  });
  if (existing) return existing.id;

  const templates = SYSTEM_ROLE_TEMPLATES[roleKey as SystemRole];
  if (!templates) throw new BadRequestException('Unknown role');

  for (const t of templates) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: t.resource, action: t.action } },
      update: {},
      create: { resource: t.resource, action: t.action },
    });
  }
  const perms = await prisma.permission.findMany();
  const permId = (r: string, a: string) => perms.find((p) => p.resource === r && p.action === a)!.id;

  const role = await prisma.role.create({
    data: {
      organizationId,
      key: roleKey,
      name: SYSTEM_ROLE_NAMES[roleKey as SystemRole] ?? roleKey,
      isSystem: true,
      permissions: { create: templates.map((t) => ({ permissionId: permId(t.resource, t.action), scope: t.scope })) },
    },
    select: { id: true },
  });
  return role.id;
}
