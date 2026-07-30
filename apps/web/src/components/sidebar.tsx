'use client';

import { useState } from 'react';
import Link from 'next/link';
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
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'Workspace' },
  { label: 'Leads', href: '/leads', icon: Users, section: 'CRM' },
  { label: 'Customers', href: '/customers', icon: Building2, section: 'CRM' },
  { label: 'Deals', href: '/deals', icon: Handshake, section: 'CRM' },
  { label: 'Projects', href: '/projects', icon: FolderKanban, section: 'Delivery' },
  { label: 'Tasks', href: '/tasks', icon: ListChecks, section: 'Delivery' },
  { label: 'Invoices', href: '/invoices', icon: Receipt, section: 'Finance' },
  { label: 'SEO', href: '/seo', icon: Search, section: 'Marketing' },
  { label: 'Content', href: '/content', icon: PenSquare, section: 'Marketing' },
  { label: 'Tickets', href: '/tickets', icon: LifeBuoy, section: 'Support' },
  { label: 'Knowledge Base', href: '/kb', icon: BookOpen, section: 'Support' },
  { label: 'Announcements', href: '/announcements', icon: Megaphone, section: 'Support' },
  { label: 'Team Chat', href: '/chat', icon: MessagesSquare, section: 'Team' },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays, section: 'Team' },
  { label: 'HR', href: '/hr', icon: CalendarCheck, section: 'Team' },
  { label: 'Automations', href: '/automations', icon: Workflow, section: 'Platform' },
  { label: 'AI Assistant', href: '/ai', icon: Sparkles, section: 'Platform' },
  { label: 'AI Search', href: '/search', icon: ScanSearch, section: 'Platform' },
  { label: 'BI Dashboard', href: '/insights', icon: LineChart, section: 'Insights' },
  { label: 'Reports', href: '/reports', icon: BarChart3, section: 'Insights' },
  { label: 'Activity', href: '/activity', icon: Activity, section: 'Insights' },
  { label: 'Team', href: '/directory', icon: Contact, section: 'Admin' },
  { label: 'Structure', href: '/structure', icon: Network, section: 'Admin' },
  { label: 'Roles', href: '/roles', icon: ShieldCheck, section: 'Admin' },
  { label: 'Audit Log', href: '/audit', icon: ScrollText, section: 'Admin' },
  { label: 'Settings', href: '/settings', icon: Settings, section: 'Admin' },
  { label: 'Profile', href: '/profile', icon: UserCircle, section: 'Admin' },
];

export function Sidebar({ brandName = 'Gnevo CRM' }: { brandName?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  let currentSection = '';
  const initial = brandName.trim().charAt(0).toUpperCase() || 'G';

  return (
    <aside
      className={cn(
        "relative flex shrink-0 flex-col border-r border-border/40 bg-background/80 backdrop-blur-xl transition-all duration-300 ease-in-out z-50",
        collapsed ? "w-[4.5rem]" : "w-64"
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
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
                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                )}
              >
                {active && !collapsed && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <Icon
                  className={cn(
                    "shrink-0 transition-colors",
                    collapsed ? "size-5" : "size-[18px]",
                    active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
                {!collapsed && <span className="text-[13.5px] leading-none">{item.label}</span>}
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
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex w-full items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground",
            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-[18px]" />
          ) : (
            <>
              <ChevronLeft className="size-[18px]" />
              <span className="text-[13px] font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
