'use client';

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  GanttChartSquare,
  ListChecks,
  Plus,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Trash2,
  CornerDownRight,
  Link2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Member } from '@/lib/crm-actions';
import {
  createTaskFull,
  deleteTaskFull,
  listTasksAction,
  updateTaskFull,
  type TaskFull,
} from '../actions';
import {
  NEXT_STATUS,
  PRIORITY_META,
  STATUS_META,
  addDays,
  blockers,
  diffDays,
  fmtShort,
  isoDay,
  isOverdue,
  parseDay,
} from './task-utils';
import { TaskDialog } from './task-dialog';

type View = 'list' | 'calendar' | 'gantt';
interface ProjectRow {
  id: string;
  name: string;
}

const VIEWS: { key: View; label: string; icon: typeof ListChecks }[] = [
  { key: 'list', label: 'List', icon: ListChecks },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'gantt', label: 'Gantt', icon: GanttChartSquare },
];

export function TasksWorkspace({
  initialTasks,
  projects,
  members,
  loadError,
}: {
  initialTasks: TaskFull[];
  projects: ProjectRow[];
  members: Member[];
  loadError: boolean;
}) {
  const [tasks, setTasks] = useState<TaskFull[]>(initialTasks);
  const [view, setView] = useState<View>('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskFull | null>(null);
  const [presetParent, setPresetParent] = useState<string | null>(null);

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const memberName = useCallback(
    (id: string | null) => (id ? members.find((m) => m.id === id)?.fullName ?? null : null),
    [members],
  );

  const refresh = useCallback(async () => {
    setTasks(await listTasksAction());
  }, []);

  const cycleStatus = useCallback(
    async (t: TaskFull) => {
      const next = NEXT_STATUS[t.status] ?? 'todo';
      setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
      const res = await updateTaskFull(t.id, { status: next });
      if (!res.ok) {
        toast.error(res.error ?? 'Failed');
        void refresh();
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (t: TaskFull) => {
      setTasks((prev) => prev.filter((x) => x.id !== t.id && x.parentId !== t.id));
      const res = await deleteTaskFull(t.id);
      if (res.ok) toast.success('Task deleted');
      else toast.error(res.error ?? 'Failed');
      void refresh();
    },
    [refresh],
  );

  function openNew(parentId: string | null = null) {
    setEditing(null);
    setPresetParent(parentId);
    setDialogOpen(true);
  }
  function openEdit(t: TaskFull) {
    setEditing(t);
    setPresetParent(null);
    setDialogOpen(true);
  }

  async function submitDialog(payload: {
    projectId: string;
    parentId?: string;
    title: string;
    priority: string;
    assigneeId?: string | null;
    startDate?: string | null;
    dueDate?: string | null;
    blockedBy?: string[];
    status?: string;
  }) {
    const res = editing
      ? await updateTaskFull(editing.id, {
          title: payload.title,
          priority: payload.priority,
          assigneeId: payload.assigneeId ?? null,
          startDate: payload.startDate ?? null,
          dueDate: payload.dueDate ?? null,
          blockedBy: payload.blockedBy,
          status: payload.status,
        })
      : await createTaskFull({
          projectId: payload.projectId,
          parentId: payload.parentId,
          title: payload.title,
          priority: payload.priority,
          assigneeId: payload.assigneeId ?? undefined,
          startDate: payload.startDate ?? undefined,
          dueDate: payload.dueDate ?? undefined,
          blockedBy: payload.blockedBy,
        });
    if (res.ok) {
      toast.success(editing ? 'Task updated' : 'Task created');
      setDialogOpen(false);
      await refresh();
    } else {
      toast.error(res.error ?? 'Could not save');
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tasks</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} across all projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-secondary/40 p-1 ring-1 ring-border/50">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer  ',
                  view === v.key ? 'bg-card text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <v.icon className="size-4" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => openNew()} disabled={projects.length === 0}>
            <Plus className="size-4" />
            New task
          </Button>
        </div>
      </div>

      {loadError ? (
        <Card className="rounded-2xl border-0 p-8 text-center text-sm text-muted-foreground ring-1 ring-border/50">
          Couldn&apos;t load tasks. Please refresh.
        </Card>
      ) : projects.length === 0 ? (
        <EmptyState title="No projects yet" hint="Create a project first, then add tasks to it." />
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks yet" hint="Create your first task to see it here." />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {view === 'list' && (
              <ListView
                tasks={tasks}
                byId={byId}
                memberName={memberName}
                onCycle={cycleStatus}
                onEdit={openEdit}
                onAddSub={(id) => openNew(id)}
                onDelete={remove}
              />
            )}
            {view === 'calendar' && <CalendarView tasks={tasks} onEdit={openEdit} />}
            {view === 'gantt' && <GanttView tasks={tasks} byId={byId} onEdit={openEdit} />}
          </motion.div>
        </AnimatePresence>
      )}

      <TaskDialog
        key={(editing?.id ?? 'new') + String(dialogOpen)}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        presetParent={presetParent}
        projects={projects}
        members={members}
        tasks={tasks}
        onSubmit={submitDialog}
      />
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <Card className="flex flex-col items-center gap-4 rounded-2xl border-0 bg-linear-to-b from-card to-card/50 p-16 text-center shadow-sm ring-1 ring-border/50">
      <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
        <ListChecks className="size-8" />
      </div>
      <div>
        <p className="text-xl font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </div>
    </Card>
  );
}

/* ─────────────────────────── List view ─────────────────────────── */

function ListView({
  tasks,
  byId,
  memberName,
  onCycle,
  onEdit,
  onAddSub,
  onDelete,
}: {
  tasks: TaskFull[];
  byId: Map<string, TaskFull>;
  memberName: (id: string | null) => string | null;
  onCycle: (t: TaskFull) => void;
  onEdit: (t: TaskFull) => void;
  onAddSub: (parentId: string) => void;
  onDelete: (t: TaskFull) => void;
}) {
  const topLevel = tasks.filter((t) => !t.parentId);
  const childrenOf = (id: string) => tasks.filter((t) => t.parentId === id);

  return (
    <Card className="overflow-hidden rounded-2xl border-0 p-2 shadow-sm ring-1 ring-border/50">
      <ul className="flex flex-col">
        {topLevel.map((t) => (
          <li key={t.id}>
            <TaskRow
              t={t}
              byId={byId}
              memberName={memberName}
              onCycle={onCycle}
              onEdit={onEdit}
              onAddSub={onAddSub}
              onDelete={onDelete}
            />
            {childrenOf(t.id).map((c) => (
              <TaskRow
                key={c.id}
                t={c}
                child
                byId={byId}
                memberName={memberName}
                onCycle={onCycle}
                onEdit={onEdit}
                onAddSub={onAddSub}
                onDelete={onDelete}
              />
            ))}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TaskRow({
  t,
  child,
  byId,
  memberName,
  onCycle,
  onEdit,
  onAddSub,
  onDelete,
}: {
  t: TaskFull;
  child?: boolean;
  byId: Map<string, TaskFull>;
  memberName: (id: string | null) => string | null;
  onCycle: (t: TaskFull) => void;
  onEdit: (t: TaskFull) => void;
  onAddSub: (parentId: string) => void;
  onDelete: (t: TaskFull) => void;
}) {
  const blocking = blockers(t, byId);
  const assignee = memberName(t.assigneeId);
  const overdue = isOverdue(t);
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary/40',
        child && 'ml-6 border-l border-border/50 pl-4',
      )}
    >
      {child && <CornerDownRight className="size-3.5 shrink-0 text-muted-foreground/50" />}
      <button
        onClick={() => onCycle(t)}
        aria-label={`Status: ${STATUS_META[t.status]?.label}. Click to advance.`}
        className={cn('size-4 shrink-0 rounded-full ring-2 ring-offset-1 ring-offset-background transition-transform hover:scale-110', STATUS_META[t.status]?.dot, 'ring-transparent')}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn('truncate text-sm font-medium', t.status === 'done' && 'text-muted-foreground line-through')}>
          {t.title}
        </span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {t.project && <span className="truncate">{t.project.name}</span>}
          {t.dueDate && (
            <span className={cn(overdue && 'font-semibold text-rose-500')}>· due {fmtShort(t.dueDate)}</span>
          )}
          {blocking.length > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0 font-medium text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
              <Lock className="size-3" />
              Blocked by {blocking.length}
            </span>
          )}
          {t.blockedBy.length > blocking.length && (
            <span className="inline-flex items-center gap-0.5 text-muted-foreground/70">
              <Link2 className="size-3" />
              {t.blockedBy.length} deps
            </span>
          )}
        </div>
      </div>

      {assignee && (
        <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex" title={assignee}>
          <span className="grid size-6 place-items-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
            {assignee.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </span>
        </span>
      )}
      <Badge variant="outline" className={cn('shrink-0 rounded-full text-[11px] capitalize', PRIORITY_META[t.priority]?.badge)}>
        {PRIORITY_META[t.priority]?.label ?? t.priority}
      </Badge>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {!child && (
          <Button variant="ghost" size="icon-sm" onClick={() => onAddSub(t.id)} aria-label="Add subtask">
            <Plus className="size-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(t)} aria-label="Edit task">
          <Pencil className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-rose-500" onClick={() => onDelete(t)} aria-label="Delete task">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Calendar view ─────────────────────────── */

function CalendarView({ tasks, onEdit }: { tasks: TaskFull[]; onEdit: (t: TaskFull) => void }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const map = new Map<string, TaskFull[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const key = isoDay(t.dueDate);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasks]);

  const monthStart = cursor;
  const firstWeekday = monthStart.getDay();
  const gridStart = addDays(monthStart, -firstWeekday);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const todayKey = isoDay(new Date());
  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Card className="rounded-2xl border-0 p-4 shadow-sm ring-1 ring-border/50">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="xs" onClick={() => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); }}>
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-border/40">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="bg-card py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((day) => {
          const key = isoDay(day);
          const inMonth = day.getMonth() === cursor.getMonth();
          const dayTasks = byDay.get(key) ?? [];
          return (
            <div key={key} className={cn('min-h-24 bg-card p-1.5', !inMonth && 'bg-secondary/20')}>
              <div className={cn('mb-1 text-right text-xs font-medium', key === todayKey ? 'text-primary' : inMonth ? 'text-foreground/70' : 'text-muted-foreground/40')}>
                {key === todayKey ? (
                  <span className="inline-grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {day.getDate()}
                  </span>
                ) : (
                  day.getDate()
                )}
              </div>
              <div className="flex flex-col gap-1">
                {dayTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onEdit(t)}
                    className={cn(
                      'flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80',
                      STATUS_META[t.status]?.badge,
                      isOverdue(t) && 'ring-1 ring-rose-400',
                    )}
                  >
                    <span className={cn('size-1.5 shrink-0 rounded-full', PRIORITY_META[t.priority]?.bar)} />
                    <span className="truncate">{t.title}</span>
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <span className="px-1 text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ─────────────────────────── Gantt view ─────────────────────────── */

function GanttView({
  tasks,
  byId,
  onEdit,
}: {
  tasks: TaskFull[];
  byId: Map<string, TaskFull>;
  onEdit: (t: TaskFull) => void;
}) {
  const dated = tasks.filter((t) => t.startDate || t.dueDate);
  if (dated.length === 0) {
    return (
      <Card className="rounded-2xl border-0 p-12 text-center ring-1 ring-border/50">
        <GanttChartSquare className="mx-auto mb-3 size-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground">No scheduled tasks</p>
        <p className="mt-1 text-xs text-muted-foreground">Add a start or due date to a task to see it on the timeline.</p>
      </Card>
    );
  }

  // Compute the overall date window.
  const points: Date[] = [];
  for (const t of dated) {
    if (t.startDate) points.push(parseDay(isoDay(t.startDate)));
    if (t.dueDate) points.push(parseDay(isoDay(t.dueDate)));
  }
  let min = points[0]!;
  let max = points[0]!;
  for (const p of points) {
    if (p < min) min = p;
    if (p > max) max = p;
  }
  min = addDays(min, -1);
  max = addDays(max, 1);
  const totalDays = Math.max(diffDays(min, max) + 1, 1);
  const dayW = totalDays > 45 ? 22 : totalDays > 21 ? 32 : 48;
  const rowH = 40;
  const labelW = 200;
  const todayOffset = diffDays(min, parseDay(isoDay(new Date())));

  const months: { label: string; span: number }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(min, i);
    const label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    const last = months[months.length - 1];
    if (last && last.label === label) last.span += 1;
    else months.push({ label, span: 1 });
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-0 shadow-sm ring-1 ring-border/50">
      <div className="overflow-x-auto">
        <div style={{ minWidth: labelW + totalDays * dayW }}>
          {/* Month header */}
          <div className="flex border-b border-border/50 bg-secondary/20">
            <div style={{ width: labelW }} className="shrink-0 px-4 py-2 text-xs font-semibold text-muted-foreground">
              Task
            </div>
            <div className="flex">
              {months.map((m, i) => (
                <div
                  key={i}
                  style={{ width: m.span * dayW }}
                  className="border-l border-border/40 px-2 py-2 text-xs font-semibold text-foreground"
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="relative">
            {/* Today marker */}
            {todayOffset >= 0 && todayOffset < totalDays && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-primary/60"
                style={{ left: labelW + todayOffset * dayW + dayW / 2 }}
              />
            )}
            {dated.map((t) => {
              const start = t.startDate ? parseDay(isoDay(t.startDate)) : parseDay(isoDay(t.dueDate!));
              const end = t.dueDate ? parseDay(isoDay(t.dueDate)) : start;
              const offset = Math.max(diffDays(min, start), 0);
              const span = Math.max(diffDays(start, end) + 1, 1);
              const blocking = blockers(t, byId);
              return (
                <div key={t.id} className="flex items-center border-b border-border/30 hover:bg-secondary/20" style={{ height: rowH }}>
                  <div style={{ width: labelW }} className="flex shrink-0 items-center gap-2 truncate px-4">
                    <span className={cn('size-2 shrink-0 rounded-full', STATUS_META[t.status]?.dot)} />
                    <span className={cn('truncate text-sm', t.status === 'done' && 'text-muted-foreground line-through')}>{t.title}</span>
                  </div>
                  <div className="relative flex-1" style={{ height: rowH }}>
                    <button
                      onClick={() => onEdit(t)}
                      title={`${t.title} · ${fmtShort(t.startDate)} → ${fmtShort(t.dueDate)}`}
                      className={cn(
                        'absolute top-1/2 flex -translate-y-1/2 items-center rounded-md px-2 text-[11px] font-medium text-white shadow-sm transition-all hover:brightness-110',
                        PRIORITY_META[t.priority]?.bar,
                        blocking.length > 0 && 'ring-2 ring-rose-400',
                      )}
                      style={{ left: offset * dayW, width: span * dayW - 4, height: rowH - 16 }}
                    >
                      <span className="truncate">{t.title}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
