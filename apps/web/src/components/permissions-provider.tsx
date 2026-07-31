'use client';

import { createContext, useContext } from 'react';
import { can as canFn, type PermAction } from '@/lib/permissions';

const PermissionsContext = createContext<string[] | undefined>(undefined);

/** Makes the current user's permissions available to client components. */
export function PermissionsProvider({
  permissions,
  children,
}: {
  permissions?: string[];
  children: React.ReactNode;
}) {
  return <PermissionsContext.Provider value={permissions}>{children}</PermissionsContext.Provider>;
}

/** Raw permission keys (undefined = unknown/old session). */
export function usePermissions() {
  return useContext(PermissionsContext);
}

/** `can('lead', 'create')` — respects the current user's permissions. */
export function useCan() {
  const permissions = useContext(PermissionsContext);
  return (resource: string, action: PermAction = 'view') => canFn(permissions, resource, action);
}
