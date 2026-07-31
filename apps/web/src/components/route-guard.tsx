'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { can, resourceForPath } from '@/lib/permissions';
import { usePermissions } from './permissions-provider';

/**
 * Client-side access guard: if the user lands on a route (via link, quick-tile,
 * or a typed URL) that needs a permission they don't have, bounce them to the
 * dashboard. The API still enforces RBAC server-side — this just keeps the UI
 * honest so nobody sees a page they can't use. Fails open when permissions are
 * unknown (old session).
 */
export function RouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const permissions = usePermissions();

  useEffect(() => {
    const resource = resourceForPath(pathname);
    if (resource && permissions && !can(permissions, resource)) {
      router.replace('/dashboard');
    }
  }, [pathname, permissions, router]);

  return null;
}
