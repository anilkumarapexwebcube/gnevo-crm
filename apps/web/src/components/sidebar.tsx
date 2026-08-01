'use client';

import { useState } from 'react';
import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  Contact,
  ChevronLeft,
  ChevronRight,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  Loader2,
  ListChecks,
  FolderKanban,
  Megaphone,
  MessagesSquare,
  Network,
  PenSquare,
  Receipt,
  ScanSearch,
  ScrollText,
  Search,
  ShieldCheck,
  Settings,
  Sparkles,
  UserCircle,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: string;
  /** RBAC resource this item needs `view`/`manage` on. Omitted = always shown. */
  resource?: string;
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'Workspace' },
  { label: 'Leads', href: '/leads', icon: Users, section: 'CRM', resource: 'lead' },
  { label: 'Customers', href: '/customers', icon: Building2, section: 'CRM', resource: 'customer' },
  { label: 'Deals', href: '/deals', icon: Handshake, section: 'CRM', resource: 'deal' },
  { label: 'Projects', href: '/projects', icon: FolderKanban, section: 'Delivery', resource: 'project' },
  { label: 'Tasks', href: '/tasks', icon: ListChecks, section: 'Delivery', resource: 'task' },
  { label: 'Invoices', href: '/invoices', icon: Receipt, section: 'Finance', resource: 'invoice' },
  { label: 'SEO', href: '/seo', icon: Search, section: 'Marketing', resource: 'seo_project' },
  { label: 'Content', href: '/content', icon: PenSquare, section: 'Marketing', resource: 'article' },
  { label: 'Tickets', href: '/tickets', icon: LifeBuoy, section: 'Support', resource: 'ticket' },
  { label: 'Knowledge Base', href: '/kb', icon: BookOpen, section: 'Support', resource: 'knowledge_base' },
  { label: 'Announcements', href: '/announcements', icon: Megaphone, section: 'Support', resource: 'announcement' },
  { label: 'Team Chat', href: '/chat', icon: MessagesSquare, section: 'Team', resource: 'chat' },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays, section: 'Team', resource: 'calendar' },
  { label: 'Workplace', href: '/hr', icon: CalendarCheck, section: 'Team', resource: 'hr' },
  { label: 'Automations', href: '/automations', icon: Workflow, section: 'Platform', resource: 'automation' },
  { label: 'AI Assistant', href: '/ai', icon: Sparkles, section: 'Platform', resource: 'ai' },
  { label: 'AI Search', href: '/search', icon: ScanSearch, section: 'Platform', resource: 'ai' },
  { label: 'BI Dashboard', href: '/insights', icon: LineChart, section: 'Insights', resource: 'report' },
  { label: 'Reports', href: '/reports', icon: BarChart3, section: 'Insights', resource: 'report' },
  { label: 'Activity', href: '/activity', icon: Activity, section: 'Insights' },
  { label: 'Team', href: '/directory', icon: Contact, section: 'Admin', resource: 'user' },
  { label: 'Structure', href: '/structure', icon: Network, section: 'Admin', resource: 'department' },
  { label: 'Roles', href: '/roles', icon: ShieldCheck, section: 'Admin', resource: 'role' },
  { label: 'Audit Log', href: '/audit', icon: ScrollText, section: 'Admin', resource: 'audit_log' },
  { label: 'Settings', href: '/settings', icon: Settings, section: 'Admin' },
  { label: 'Profile', href: '/profile', icon: UserCircle, section: 'Admin' },
];

export function Sidebar({
  brandName = 'Gnevo CRM',
  permissions,
}: {
  brandName?: string;
  /** User's effective `resource:action` keys. Undefined = fail open (show all). */
  permissions?: string[];
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  let currentSection = '';
  const initial = brandName.trim().charAt(0).toUpperCase() || 'G';

  // Show an item if it has no resource, or the user can view/manage it. If
  // permissions are unknown (old session before this rolled out), fail open.
  const canView = (resource?: string) => {
    if (!resource || !permissions) return true;
    return permissions.includes(`${resource}:manage`) || permissions.includes(`${resource}:view`);
  };
  const visibleNav = NAV.filter((item) => canView(item.resource));

  return (
    <aside
      className={cn(
        "relative flex shrink-0 flex-col border-r border-border/40 bg-background/80 backdrop-blur-xl transition-all duration-300 ease-in-out z-50",
        collapsed ? "w-18" : "w-64"
      )}
    >
      <div className={cn("flex h-16 items-center px-4", collapsed ? "justify-center" : "gap-3")}>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-primary to-purple-600 text-sm font-bold text-primary-foreground shadow-md shadow-primary/25">
            {initial}
          </span>
          {!collapsed && (
            <span className="text-[15px] font-bold tracking-tight text-foreground transition-opacity duration-300">
              {brandName}
            </span>
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
        <nav className="flex flex-col gap-0.5">
          {visibleNav.map((item) => {
            const showSection = item.section && item.section !== currentSection;
            if (item.section) currentSection = item.section;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center rounded-lg font-medium transition-colors duration-150",
                  collapsed ? "justify-center size-10 mx-auto" : "gap-3 px-3 py-2",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-foreground/4 hover:text-foreground"
                )}
              >
                {active && !collapsed && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <Icon
                  className={cn(
                    "shrink-0 transition-colors",
                    collapsed ? "size-5" : "size-4.5",
                    active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
                {!collapsed && <span className="text-[15px] leading-none">{item.label}</span>}
                {!collapsed && <NavPending />}
              </Link>
            );

            return (
              <div key={item.href} className="w-full">
                {showSection && !collapsed && (
                  <p className="mb-1.5 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
                    {item.section}
                  </p>
                )}
                {showSection && collapsed && <div className="mx-auto mb-2 mt-4 h-px w-6 bg-border/50" />}

                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger render={linkContent} />
                    <TooltipContent side="right" className="px-2 py-1 text-xs font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border/40 p-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="flex w-full items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-foreground/4 hover:text-foreground cursor-pointer"
                >
                  <ChevronRight className="size-4.5" />
                </button>
              }
            />
            <TooltipContent side="right" className="px-2 py-1 text-xs font-medium">
              Expand
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-foreground/4 hover:text-foreground cursor-pointer"
          >
            <ChevronLeft className="size-4.5" />
            <span className="text-[13px] font-medium">Collapse</span>
          </button>
        )}
      </div>
    </aside>
  );
}

/** Shows a spinner on the sidebar link being navigated to (instant click feedback). */
function NavPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 className="ml-auto size-3.5 shrink-0 animate-spin text-primary" />;
}
