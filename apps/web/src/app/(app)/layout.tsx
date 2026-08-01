import { redirect } from 'next/navigation';
import { getCurrentUser, apiServer } from '@/lib/session';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { IdleWatcher } from '@/components/idle-watcher';
import { PermissionsProvider } from '@/components/permissions-provider';
import { RouteGuard } from '@/components/route-guard';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Fetch everything the shell needs in parallel — one round-trip, not three.
  const [user, brandingRes, securityRes] = await Promise.all([
    getCurrentUser(),
    apiServer<{ displayName: string; brandColor: string | null; theme: 'light' | 'dark' | 'system' }>('/v1/org/branding').catch(() => null),
    apiServer<{ idleTimeoutMinutes: number }>('/v1/org/security').catch(() => null),
  ]);
  if (!user) redirect('/login');

  const branding = brandingRes ?? { displayName: 'Gnevo CRM', brandColor: null as string | null, theme: 'system' as 'light' | 'dark' | 'system' };
  const idleTimeoutMinutes = securityRes?.idleTimeoutMinutes ?? 0;

  return (
    <PermissionsProvider permissions={user.permissions}>
      <TooltipProvider>
        {branding.brandColor && (
          <style
            dangerouslySetInnerHTML={{
              __html: `:root{--primary:${branding.brandColor};}`,
            }}
          />
        )}
        {/* Apply the workspace's default theme when the user hasn't picked their own. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(!localStorage.getItem('theme')){var t=${JSON.stringify(branding.theme)};var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}}catch(e){}})();`,
          }}
        />
        <RouteGuard />
        <div className="flex h-screen overflow-hidden">
          <Sidebar brandName={branding.displayName} permissions={user.permissions} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar user={user} />
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </div>
          <Toaster />
        </div>
        <IdleWatcher minutes={idleTimeoutMinutes} />
      </TooltipProvider>
    </PermissionsProvider>
  );
}
