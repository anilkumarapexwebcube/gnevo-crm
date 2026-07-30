import { describe, expect, it } from 'vitest';
import { hasPermission, SYSTEM_ROLE_TEMPLATES } from './rbac.js';
import { permissionKey } from '@gnevo/types';

describe('hasPermission', () => {
  it('grants when the exact resource:action is present', () => {
    const granted = new Set([permissionKey('lead', 'view')]);
    expect(hasPermission(granted, 'lead', 'view')).toBe(true);
  });

  it('denies when the permission is absent', () => {
    const granted = new Set([permissionKey('lead', 'view')]);
    expect(hasPermission(granted, 'lead', 'delete')).toBe(false);
  });

  it('`manage` implies any action on the resource', () => {
    const granted = new Set([permissionKey('deal', 'manage')]);
    expect(hasPermission(granted, 'deal', 'delete')).toBe(true);
    expect(hasPermission(granted, 'deal', 'create')).toBe(true);
  });
});

describe('SYSTEM_ROLE_TEMPLATES', () => {
  it('owner can manage the organization; viewer cannot', () => {
    const owner = new Set(
      SYSTEM_ROLE_TEMPLATES.owner.map((p) => permissionKey(p.resource, p.action)),
    );
    const viewer = new Set(
      SYSTEM_ROLE_TEMPLATES.viewer.map((p) => permissionKey(p.resource, p.action)),
    );
    expect(hasPermission(owner, 'organization', 'manage')).toBe(true);
    expect(hasPermission(viewer, 'lead', 'delete')).toBe(false);
    expect(hasPermission(viewer, 'lead', 'view')).toBe(true);
  });
});
