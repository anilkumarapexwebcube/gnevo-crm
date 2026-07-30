import { SetMetadata } from '@nestjs/common';
import type { Action, Resource } from '@gnevo/types';

export const PERMISSIONS_KEY = 'permissions';

export interface RequiredPermission {
  resource: Resource;
  action: Action;
}

/** Declares the permission(s) required to access a route (checked by RbacGuard). */
export const RequirePermissions = (...perms: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);
