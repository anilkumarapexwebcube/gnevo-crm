import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ResourceSchema } from '@gnevo/types';
import { PrismaService } from '../../prisma/prisma.service.js';

const ACTIONS = ['view', 'create', 'update', 'delete', 'manage'] as const;
const SCOPES = ['org', 'department', 'own'] as const;

interface PermInput {
  resource: string;
  action: string;
  scope?: string;
}

function slugKey(name: string): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'role';
  return `custom_${base}_${Date.now().toString(36)}`;
}

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  catalog() {
    return {
      resources: ResourceSchema.options,
      actions: ACTIONS,
      scopes: SCOPES,
    };
  }

  async list(organizationId: string) {
    const roles = await this.prisma.role.findMany({
      where: { organizationId },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        key: true,
        name: true,
        isSystem: true,
        permissions: { select: { scope: true, permission: { select: { resource: true, action: true } } } },
        _count: { select: { users: true } },
      },
    });
    return roles.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      isSystem: r.isSystem,
      memberCount: r._count.users,
      permissions: r.permissions.map((p) => ({ resource: p.permission.resource, action: p.permission.action, scope: p.scope })),
    }));
  }

  private async ensurePermIds(perms: PermInput[]): Promise<{ permissionId: string; scope: string }[]> {
    const valid = perms.filter((p) => ResourceSchema.options.includes(p.resource as never) && ACTIONS.includes(p.action as never));
    for (const p of valid) {
      await this.prisma.permission.upsert({
        where: { resource_action: { resource: p.resource, action: p.action } },
        update: {},
        create: { resource: p.resource, action: p.action },
      });
    }
    const all = await this.prisma.permission.findMany();
    return valid.map((p) => ({
      permissionId: all.find((x) => x.resource === p.resource && x.action === p.action)!.id,
      scope: SCOPES.includes((p.scope ?? 'org') as never) ? p.scope ?? 'org' : 'org',
    }));
  }

  async create(organizationId: string, dto: { name: string; permissions: PermInput[] }) {
    if (!dto.name.trim()) throw new BadRequestException('Role name is required');
    const links = await this.ensurePermIds(dto.permissions ?? []);
    const role = await this.prisma.role.create({
      data: {
        organizationId,
        key: slugKey(dto.name),
        name: dto.name.trim(),
        isSystem: false,
        permissions: { create: links },
      },
      select: { id: true },
    });
    return { id: role.id };
  }

  async clone(organizationId: string, sourceId: string, name?: string) {
    const source = await this.prisma.role.findFirst({
      where: { id: sourceId, organizationId },
      select: { name: true, permissions: { select: { scope: true, permission: { select: { resource: true, action: true } } } } },
    });
    if (!source) throw new NotFoundException('Role not found');
    const links = await this.ensurePermIds(
      source.permissions.map((p) => ({ resource: p.permission.resource, action: p.permission.action, scope: p.scope })),
    );
    const role = await this.prisma.role.create({
      data: {
        organizationId,
        key: slugKey(name ?? `${source.name} copy`),
        name: (name ?? `${source.name} (copy)`).trim(),
        isSystem: false,
        permissions: { create: links },
      },
      select: { id: true },
    });
    return { id: role.id };
  }

  async update(organizationId: string, id: string, dto: { name?: string; permissions?: PermInput[] }) {
    const role = await this.prisma.role.findFirst({ where: { id, organizationId }, select: { id: true, isSystem: true } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new ForbiddenException('System roles cannot be edited');

    if (dto.permissions) {
      const links = await this.ensurePermIds(dto.permissions);
      await this.prisma.$transaction([
        this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
        ...(links.length
          ? [this.prisma.rolePermission.createMany({ data: links.map((l) => ({ roleId: id, ...l })) })]
          : []),
      ]);
    }
    if (dto.name?.trim()) {
      await this.prisma.role.update({ where: { id }, data: { name: dto.name.trim() } });
    }
    return { ok: true };
  }

  async remove(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId },
      select: { id: true, isSystem: true, _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new ForbiddenException('System roles cannot be deleted');
    if (role._count.users > 0) throw new BadRequestException('Reassign members off this role before deleting it');
    await this.prisma.role.delete({ where: { id } });
    return { ok: true };
  }
}
