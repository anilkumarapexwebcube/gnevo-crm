import { redirect } from 'next/navigation';
import { getCurrentUser, apiServer } from '@/lib/session';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { IdleWatcher } from '@/components/idle-watcher';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  let branding = { displayName: 'Gnevo CRM', brandColor: null as string | null };
  try {
    branding = await apiServer<{ displayName: string; brandColor: string | null }>('/v1/org/branding');
  } catch {
    /* fall back to defaults */
  }

  let idleTimeoutMinutes = 0;
  try {
    idleTimeoutMinutes = (await apiServer<{ idleTimeoutMinutes: number }>('/v1/org/security')).idleTimeoutMinutes;
  } catch {
    /* default off */
  }

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
        <Sidebar brandName={branding.displayName} />
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
