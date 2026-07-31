import {
  type Action,
  type Resource,
  type Scope,
  type SystemRole,
  permissionKey,
} from '@gnevo/types';

/**
 * System role → permission templates seeded for every organization.
 * `manage` implies all actions on a resource. Scope narrows data visibility.
 */
export interface RolePermissionTemplate {
  resource: Resource;
  action: Action;
  scope: Scope;
}

const ALL_RESOURCES: Resource[] = [
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
  'knowledge_base',
  'announcement',
  'calendar',
  'chat',
  'hr',
  'audit_log',
  'setting',
  'api_key',
];

function manageAll(scope: Scope): RolePermissionTemplate[] {
  return ALL_RESOURCES.map((resource) => ({ resource, action: 'manage', scope }));
}

const CRM_RESOURCES: Resource[] = [
  'lead',
  'customer',
  'contact',
  'deal',
  'pipeline',
  'project',
  'task',
  'seo_project',
  'campaign',
  'report',
  'ai',
  'ticket',
  'article',
  'announcement',
];

const PEOPLE_RESOURCES: Resource[] = ['user', 'department', 'team', 'office'];

// Collaboration tools every staff member uses day-to-day.
const COLLAB_RESOURCES: Resource[] = ['calendar', 'chat', 'knowledge_base'];

export const SYSTEM_ROLE_TEMPLATES: Record<SystemRole, RolePermissionTemplate[]> = {
  owner: manageAll('org'),
  admin: manageAll('org').filter((p) => p.resource !== 'organization'),
  // HR: full people/org-structure management + read-only org context. Cannot
  // touch admins/owner (enforced in code), and has no CRM data powers by default.
  hr: [
    ...PEOPLE_RESOURCES.map((resource) => ({ resource, action: 'manage' as Action, scope: 'org' as Scope })),
    { resource: 'hr', action: 'manage', scope: 'org' },
    { resource: 'organization', action: 'view', scope: 'org' },
    { resource: 'report', action: 'view', scope: 'org' },
    { resource: 'announcement', action: 'view', scope: 'org' },
    ...COLLAB_RESOURCES.map((resource) => ({ resource, action: 'view' as Action, scope: 'org' as Scope })),
  ],
  manager: [
    ...CRM_RESOURCES.flatMap((resource) =>
      (['view', 'create', 'update', 'delete'] as Action[]).map((action) => ({
        resource,
        action,
        scope: 'department' as Scope,
      })),
    ),
    ...COLLAB_RESOURCES.flatMap((resource) =>
      (['view', 'create', 'update'] as Action[]).map((action) => ({ resource, action, scope: 'department' as Scope })),
    ),
    { resource: 'hr', action: 'view', scope: 'own' },
  ],
  member: [
    ...CRM_RESOURCES.flatMap((resource) =>
      (['view', 'create', 'update'] as Action[]).map((action) => ({
        resource,
        action,
        scope: 'own' as Scope,
      })),
    ),
    ...COLLAB_RESOURCES.flatMap((resource) =>
      (['view', 'create', 'update'] as Action[]).map((action) => ({ resource, action, scope: 'own' as Scope })),
    ),
    { resource: 'hr', action: 'view', scope: 'own' },
  ],
  viewer: [
    ...CRM_RESOURCES.map((resource) => ({ resource, action: 'view' as Action, scope: 'org' as Scope })),
    ...COLLAB_RESOURCES.map((resource) => ({ resource, action: 'view' as Action, scope: 'org' as Scope })),
    { resource: 'hr', action: 'view', scope: 'org' },
  ],
};

export const SYSTEM_ROLE_NAMES: Record<SystemRole, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  hr: 'HR',
  manager: 'Manager',
  member: 'Employee',
  viewer: 'Viewer',
};

/**
 * Decide whether a set of granted `resource:action` keys satisfies a required
 * permission. `manage` on a resource satisfies any action on it.
 */
export function hasPermission(
  granted: Set<string>,
  resource: Resource,
  action: Action,
): boolean {
  return (
    granted.has(permissionKey(resource, 'manage')) ||
    granted.has(permissionKey(resource, action))
  );
}
