import { z } from 'zod';

/**
 * Permission model: resource × action, constrained by a scope.
 * A role grants permissions; a user holds roles. Enforced server-side
 * on every endpoint (RbacGuard) and defended by Postgres RLS.
 */
export const ResourceSchema = z.enum([
  'organization',
  'office',
  'department',
  'team',
  'user',
  'role',
  'lead',
  'customer',
  'contact',
  'deal',
  'pipeline',
  'project',
  'task',
  'invoice',
  'payment',
  'seo_project',
  'campaign',
  'automation',
  'report',
  'ai',
  'ticket',
  'article',
  'announcement',
  'audit_log',
  'setting',
  'api_key',
]);
export type Resource = z.infer<typeof ResourceSchema>;

export const ActionSchema = z.enum(['view', 'create', 'update', 'delete', 'manage']);
export type Action = z.infer<typeof ActionSchema>;

/** Scope narrows a permission to a subset of the tenant's data. */
export const ScopeSchema = z.enum(['org', 'office', 'department', 'team', 'own']);
export type Scope = z.infer<typeof ScopeSchema>;

export const PermissionSchema = z.object({
  resource: ResourceSchema,
  action: ActionSchema,
  scope: ScopeSchema.default('org'),
});
export type Permission = z.infer<typeof PermissionSchema>;

/** `resource:action` string used in code + API-key scopes. */
export const PermissionKeySchema = z
  .string()
  .regex(/^[a-z_]+:[a-z_]+$/, 'must be `resource:action`');

export function permissionKey(resource: Resource, action: Action): string {
  return `${resource}:${action}`;
}

/** System role keys seeded for every organization. */
export const SystemRoleSchema = z.enum([
  'owner',
  'admin',
  'hr',
  'manager',
  'member',
  'viewer',
]);
export type SystemRole = z.infer<typeof SystemRoleSchema>;
