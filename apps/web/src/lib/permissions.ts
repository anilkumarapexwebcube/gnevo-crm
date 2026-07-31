/**
 * Client + server permission helpers. Permissions are `resource:action` keys
 * (e.g. `lead:view`, `report:manage`) resolved from the user's roles and
 * returned by `/v1/auth/me`. `manage` on a resource satisfies every action.
 */
export type PermAction = 'view' | 'create' | 'update' | 'delete' | 'manage';

/**
 * Whether the given permission set allows `action` on `resource`.
 * Fail-OPEN when `permissions` is undefined/null (unknown — e.g. an old session
 * issued before permissions were added) so we never lock users out by mistake.
 */
export function can(
  permissions: string[] | undefined | null,
  resource: string,
  action: PermAction = 'view',
): boolean {
  if (!permissions) return true;
  return permissions.includes(`${resource}:manage`) || permissions.includes(`${resource}:${action}`);
}

/**
 * App route (prefix) → the RBAC resource it requires `view` on. Routes not
 * listed here are open to any signed-in user (Dashboard, Tasks self-view,
 * Settings account, Profile, Activity, etc.).
 */
export const ROUTE_RESOURCE: Record<string, string> = {
  '/leads': 'lead',
  '/customers': 'customer',
  '/deals': 'deal',
  '/projects': 'project',
  '/invoices': 'invoice',
  '/seo': 'seo_project',
  '/content': 'article',
  '/tickets': 'ticket',
  '/kb': 'knowledge_base',
  '/announcements': 'announcement',
  '/chat': 'chat',
  '/calendar': 'calendar',
  '/hr': 'hr',
  '/automations': 'automation',
  '/insights': 'report',
  '/reports': 'report',
  '/directory': 'user',
  '/structure': 'department',
  '/roles': 'role',
  '/audit': 'audit_log',
};

/** The resource required to access `pathname`, or null if the route is open. */
export function resourceForPath(pathname: string): string | null {
  const match = Object.keys(ROUTE_RESOURCE)
    .filter((p) => pathname === p || pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? ROUTE_RESOURCE[match]! : null;
}
