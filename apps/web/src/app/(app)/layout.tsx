import { redirect } from 'next/navigation';
import { getCurrentUser, apiServer } from '@/lib/session';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { IdleWatcher } from '@/components/idle-watcher';
import { PermissionsProvider } from '@/components/permissions-provider';
import { RouteGuard } from '@/components/route-guard';

interface ThemeColors {
  background?: string;
  foreground?: string;
  card?: string;
  border?: string;
}
interface Branding {
  displayName: string;
  brandColor: string | null;
  theme: 'light' | 'dark' | 'system';
  colors: { light?: ThemeColors; dark?: ThemeColors };
}

/** CSS-variable overrides for one theme (only the keys the org customized). */
function themeVars(c?: ThemeColors): string {
  if (!c) return '';
  const v: string[] = [];
  if (c.background) v.push(`--background:${c.background}`);
  if (c.foreground) v.push(`--foreground:${c.foreground};--card-foreground:${c.foreground};--popover-foreground:${c.foreground}`);
  if (c.card) v.push(`--card:${c.card};--popover:${c.card}`);
  if (c.border) v.push(`--border:${c.border};--input:${c.border}`);
  return v.join(';');
}

/** Builds the inline <style> that white-labels the app (brand color + theme colors). */
function buildBrandCss(b: Branding): string {
  const lightVars = themeVars(b.colors?.light);
  const darkVars = themeVars(b.colors?.dark);
  return [
    b.brandColor ? `:root{--primary:${b.brandColor};--ring:${b.brandColor};}` : '',
    lightVars ? `:root{${lightVars}}` : '',
    darkVars ? `.dark{${darkVars}}` : '',
  ].join('');
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Fetch everything the shell needs in parallel — one round-trip, not three.
  const [user, brandingRes, securityRes] = await Promise.all([
    getCurrentUser(),
    apiServer<Branding>('/v1/org/branding').catch(() => null),
    apiServer<{ idleTimeoutMinutes: number }>('/v1/org/security').catch(() => null),
  ]);
  if (!user) redirect('/login');

  const branding: Branding = brandingRes ?? { displayName: 'Gnevo CRM', brandColor: null, theme: 'system', colors: {} };
  const brandCss = buildBrandCss(branding);
  const idleTimeoutMinutes = securityRes?.idleTimeoutMinutes ?? 0;

  return (
    <PermissionsProvider permissions={user.permissions}>
      <TooltipProvider>
        {brandCss && <style dangerouslySetInnerHTML={{ __html: brandCss }} />}
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
