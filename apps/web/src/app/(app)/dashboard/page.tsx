import Link from 'next/link';
import {
  ArrowRight,
  DollarSign,
  Handshake,
  Target,
  ListChecks,
  CalendarClock,
  Video,
  Users,
  Building2,
  FolderKanban,
  LifeBuoy,
  CalendarCheck,
  BarChart3,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { apiServer, getCurrentUser } from '@/lib/session';
import { can } from '@/lib/permissions';
import { Card } from '@/components/ui/card';
import { UserAvatar } from '@/components/user-avatar';
import { PipelineChart } from './_components/pipeline-chart';

interface Stage {
  id: string;
  name: string;
  total: number;
  deals: { value: number; status: string }[];
}
interface Board {
  pipeline: { id: string; name: string } | null;
  stages: Stage[];
  forecast: number;
}
interface Productivity {
  tasksTodo: number;
  tasksInProgress: number;
  tasksDone: number;
  tasksOverdue: number;
}
interface UpcomingEvent {
  id: string;
  title: string;
  startAt: string;
  type: string;
}

function money(v: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  let board: Board = { pipeline: null, stages: [], forecast: 0 };
  let prod: Productivity | null = null;
  let upcoming: UpcomingEvent[] = [];

  const results = await Promise.allSettled([
    apiServer<Board>('/v1/deals/board'),
    apiServer<Productivity>('/v1/users/me/productivity'),
    apiServer<UpcomingEvent[]>('/v1/calendar/upcoming'),
  ]);
  if (results[0].status === 'fulfilled') board = results[0].value;
  if (results[1].status === 'fulfilled') prod = results[1].value;
  if (results[2].status === 'fulfilled') upcoming = results[2].value;

  const allDeals = board.stages.flatMap((s) => s.deals);
  const wonValue = allDeals.filter((d) => d.status === 'won').reduce((s, d) => s + d.value, 0);
  const openCount = allDeals.filter((d) => d.status === 'open').length;
  const myOpenTasks = prod ? prod.tasksTodo + prod.tasksInProgress : 0;

  // Only surface KPIs/links for tools this user can actually open (RBAC).
  const perms = user?.permissions;
  const allKpis: { label: string; value: string; icon: LucideIcon; href: string; accent: string; resource?: string }[] = [
    { label: 'Open forecast', value: money(board.forecast), icon: DollarSign, href: '/deals', accent: 'text-emerald-600 dark:text-emerald-400', resource: 'deal' },
    { label: 'Open deals', value: String(openCount), icon: Handshake, href: '/deals', accent: 'text-primary', resource: 'deal' },
    { label: 'Won value', value: money(wonValue), icon: Target, href: '/reports', accent: 'text-violet-600 dark:text-violet-400', resource: 'report' },
    { label: 'My open tasks', value: String(myOpenTasks), icon: ListChecks, href: '/tasks', accent: prod && prod.tasksOverdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground' },
  ];
  const kpis = allKpis.filter((k) => !k.resource || can(perms, k.resource));

  const chartData = board.stages.map((s) => ({ name: s.name, value: s.total }));
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const links = (
    [
      { label: 'Deals', href: '/deals', icon: Handshake, resource: 'deal' },
      { label: 'Leads', href: '/leads', icon: Users, resource: 'lead' },
      { label: 'Customers', href: '/customers', icon: Building2, resource: 'customer' },
      { label: 'Projects', href: '/projects', icon: FolderKanban, resource: 'project' },
      { label: 'Tasks', href: '/tasks', icon: ListChecks },
      { label: 'Tickets', href: '/tickets', icon: LifeBuoy, resource: 'ticket' },
      { label: 'Calendar', href: '/calendar', icon: CalendarClock, resource: 'calendar' },
      { label: 'Workplace', href: '/hr', icon: CalendarCheck, resource: 'hr' },
      { label: 'Reports', href: '/reports', icon: BarChart3, resource: 'report' },
      { label: 'Knowledge Base', href: '/kb', icon: BookOpen, resource: 'knowledge_base' },
    ] as { label: string; href: string; icon: LucideIcon; resource?: string }[]
  )
    .filter((l) => !l.resource || can(perms, l.resource))
    .slice(0, 6);
  const evTime = (iso: string) => {
    const d = new Date(iso);
    let h = d.getHours();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${d.getDate()}/${d.getMonth() + 1} · ${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap}`;
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero */}
      <Card className="relative overflow-hidden rounded-3xl border-0 bg-linear-to-br from-primary/12 via-card to-card p-6 shadow-sm ring-1 ring-border/50">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <UserAvatar userId={user?.id ?? ''} name={user?.fullName || user?.email || ''} className="size-14 text-lg shadow-md ring-2 ring-background" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{today}</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {user?.fullName?.split(' ')[0] ?? 'there'} 👋
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Here&apos;s what&apos;s happening in your workspace today.</p>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="group gap-2 overflow-hidden p-4 ring-1 ring-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                  <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-4" />
                  </span>
                </div>
                <span className={`mt-1 block text-2xl font-bold tabular-nums tracking-tight ${kpi.accent}`}>{kpi.value}</span>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pipeline */}
        <Card className="relative overflow-hidden p-5 ring-1 ring-border/50 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">Pipeline by stage</h2>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{board.pipeline?.name ?? '—'}</span>
          </div>
          {chartData.length > 0 ? <PipelineChart data={chartData} /> : <p className="py-12 text-center text-sm text-muted-foreground">No pipeline data yet.</p>}
        </Card>

        {/* Upcoming */}
        <Card className="flex flex-col p-5 ring-1 ring-border/50">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <CalendarClock className="size-4 text-primary" />
            Upcoming
          </h2>
          <div className="mt-3 flex flex-1 flex-col gap-2">
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing scheduled.</p>
            ) : (
              upcoming.slice(0, 5).map((e) => (
                <Link key={e.id} href="/calendar" className="flex items-center gap-2.5 rounded-xl border border-border/50 p-2.5 transition-colors hover:bg-secondary/40">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${e.type === 'meeting' ? 'bg-primary/15 text-primary' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'}`}>
                    {e.type === 'meeting' ? <Video className="size-4" /> : <CalendarClock className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{evTime(e.startAt)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
          {prod && (
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/40 pt-4 text-center">
              <div><p className="text-lg font-bold text-foreground">{prod.tasksInProgress}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Doing</p></div>
              <div><p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{prod.tasksDone}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Done</p></div>
              <div><p className={`text-lg font-bold ${prod.tasksOverdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>{prod.tasksOverdue}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Overdue</p></div>
            </div>
          )}
        </Card>
      </div>

      {/* Quick links */}
      <Card className="p-5 ring-1 ring-border/50">
        <h2 className="mb-3 text-base font-semibold tracking-tight">Jump back in</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href} className="group flex flex-col items-center gap-2 rounded-2xl border border-border/50 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5">
                <span className="grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <Icon className="size-5" />
                </span>
                <span className="text-xs font-medium text-foreground">{l.label}</span>
                <ArrowRight className="size-3 text-muted-foreground/0 transition-all group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
