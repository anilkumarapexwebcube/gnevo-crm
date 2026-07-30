import Link from 'next/link';
import type { AuthUser } from '@gnevo/types';
import { ThemeToggle } from './theme-toggle';
import { LogoutButton } from './logout-button';
import { GlobalSearch } from './global-search';
import { NotificationBell } from './notification-bell';
import { UserAvatar } from './user-avatar';

export function Topbar({ user }: { user: AuthUser }) {
  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-background/70 backdrop-blur-xl px-6 transition-all duration-300">
      <GlobalSearch />

      <div className="flex items-center gap-4">
        <NotificationBell />
        <ThemeToggle />
        
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-full border border-border/30 bg-secondary/20 py-1 pl-1 pr-4 shadow-sm transition-all duration-300 hover:border-primary/20 hover:bg-secondary/40 cursor-pointer group"
        >
          <UserAvatar userId={user.id} name={user.fullName || user.email} className="size-8 text-xs ring-2 ring-background" />
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold leading-none tracking-tight text-foreground transition-colors group-hover:text-primary">{user.fullName}</p>
            <p className="text-xs leading-tight text-muted-foreground mt-0.5">{user.email}</p>
          </div>
        </Link>
        
        <div className="pl-1 border-l border-border/40 flex items-center">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
