import { redirect } from 'next/navigation';
import { getCurrentUser, apiServer } from '@/lib/session';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { IdleWatcher } from '@/components/idle-watcher';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Fetch everything the shell needs in parallel — one round-trip, not three.
  const [user, brandingRes, securityRes] = await Promise.all([
    getCurrentUser(),
    apiServer<{ displayName: string; brandColor: string | null }>('/v1/org/branding').catch(() => null),
    apiServer<{ idleTimeoutMinutes: number }>('/v1/org/security').catch(() => null),
  ]);
  if (!user) redirect('/login');

  const branding = brandingRes ?? { displayName: 'Gnevo CRM', brandColor: null as string | null };
  const idleTimeoutMinutes = securityRes?.idleTimeoutMinutes ?? 0;

  return (
    <TooltipProvider>
      {branding.brandColor && (
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--primary:${branding.brandColor};}`,
          }}
        />
      )}
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
  );
}
