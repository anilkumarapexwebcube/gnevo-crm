import type { TaskFull } from '../actions';

export const STATUS_META: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  todo: {
    label: 'To do',
    dot: 'bg-slate-400',
    badge: 'text-slate-600 border-slate-200 bg-slate-100 dark:text-slate-300 dark:bg-slate-500/15',
  },
  in_progress: {
    label: 'In progress',
    dot: 'bg-blue-500',
    badge: 'text-blue-700 border-blue-200 bg-blue-100 dark:text-blue-400 dark:bg-blue-500/15',
  },
  done: {
    label: 'Done',
    dot: 'bg-emerald-500',
    badge: 'text-emerald-700 border-emerald-200 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15',
  },
};

export const NEXT_STATUS: Record<string, 'todo' | 'in_progress' | 'done'> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
};

export const PRIORITY_META: Record<string, { label: string; badge: string; bar: string }> = {
  low: { label: 'Low', badge: 'text-slate-600 border-slate-200 bg-slate-100 dark:text-slate-300 dark:bg-slate-500/15', bar: 'bg-slate-400' },
  medium: { label: 'Medium', badge: 'text-blue-700 border-blue-200 bg-blue-100 dark:text-blue-400 dark:bg-blue-500/15', bar: 'bg-blue-500' },
  high: { label: 'High', badge: 'text-amber-700 border-amber-200 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/15', bar: 'bg-amber-500' },
  urgent: { label: 'Urgent', badge: 'text-rose-700 border-rose-200 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/15', bar: 'bg-rose-500' },
};

/** yyyy-mm-dd for an ISO/date string (UTC-safe day). */
export function isoDay(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDay(s: string): Date {
  return new Date(`${s.slice(0, 10)}T00:00:00`);
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function fmtShort(s: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** A task is blocked when any of its dependencies is not yet done. */
export function blockers(task: TaskFull, byId: Map<string, TaskFull>): TaskFull[] {
  return task.blockedBy.map((id) => byId.get(id)).filter((t): t is TaskFull => !!t && t.status !== 'done');
}

export function isOverdue(t: TaskFull): boolean {
  if (!t.dueDate || t.status === 'done') return false;
  return parseDay(isoDay(t.dueDate)) < parseDay(isoDay(new Date()));
}
