import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthedRequest } from '../types.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import {
  PERMISSIONS_KEY,
  type RequiredPermission,
} from '../decorators/permissions.decorator.js';
import { RbacService } from '../../modules/rbac/rbac.service.js';

/**
 * Enforces @RequirePermissions on a route by resolving the user's granted
 * permissions (from their roles) and checking each requirement. Runs after
 * JwtAuthGuard, so `req.user` is present.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    // API-key principals get full org access (scoped to their org).
    if (req.user?.roles?.includes('api')) return true;
    const granted = await this.rbac.getGrantedPermissions(req.user.id, req.user.organizationId);

    for (const perm of required) {
      if (!this.rbac.satisfies(granted, perm.resource, perm.action)) {
        throw new ForbiddenException(
          `Missing permission: ${perm.resource}:${perm.action}`,
        );
      }
    }
    return true;
  }
}
