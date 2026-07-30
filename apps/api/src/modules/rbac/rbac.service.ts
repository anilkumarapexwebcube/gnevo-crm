import { Injectable } from '@nestjs/common';
import { hasPermission } from '@gnevo/auth';
import { permissionKey, type Action, type Resource } from '@gnevo/types';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Resolves a user's effective permission set from their roles.
 * (Skeleton: resolved per-request; production caches this in Redis with
 * invalidation on role change — see docs/13-performance-checklist.md.)
 */
@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async getGrantedPermissions(userId: string, organizationId: string): Promise<Set<string>> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            organizationId: true,
            permissions: {
              select: { permission: { select: { resource: true, action: true } } },
            },
          },
        },
      },
    });

    const granted = new Set<string>();
    for (const ur of userRoles) {
      // Defense in depth: only honor roles belonging to the user's tenant.
      if (ur.role.organizationId && ur.role.organizationId !== organizationId) continue;
      for (const rp of ur.role.permissions) {
        granted.add(permissionKey(rp.permission.resource as Resource, rp.permission.action as Action));
      }
    }
    return granted;
  }

  satisfies(granted: Set<string>, resource: Resource, action: Action): boolean {
    return hasPermission(granted, resource, action);
  }
}
