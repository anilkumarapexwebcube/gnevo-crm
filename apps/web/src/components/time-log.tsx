'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listTime, logTime, deleteTime, type TimeEntry } from '@/lib/crm-actions';

function human(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function TimeLog({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState('');
  const [mins, setMins] = useState('');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listTime(projectId);
    setEntries(res.entries);
    setTotal(res.totalMinutes);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const total = (Number(hours) || 0) * 60 + (Number(mins) || 0);
    if (total <= 0) {
      toast.error('Enter a duration');
      return;
    }
    startTransition(async () => {
      const res = await logTime({ projectId, minutes: total, note: note.trim() || undefined });
      if (res.ok) {
        setHours('');
        setMins('');
        setNote('');
        toast.success('Time logged');
        await load();
      } else {
        toast.error(res.error ?? 'Could not log');
      }
    });
  }

  function remove(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const res = await deleteTime(id);
      if (res.ok) await load();
      setBusyId(null);
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock className="size-4 text-muted-foreground" />
          Time tracking
        </h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Total: {human(total)}
        </span>
      </div>

      <form onSubmit={add} className="flex flex-wrap items-end gap-2 rounded-xl border border-border/50 p-3">
        <div className="flex items-end gap-1">
          <Input value={hours} onChange={(e) => setHours(e.target.value.replace(/\D/g, ''))} placeholder="0" className="h-9 w-14 text-center" aria-label="Hours" />
          <span className="pb-2 text-xs text-muted-foreground">h</span>
          <Input value={mins} onChange={(e) => setMins(e.target.value.replace(/\D/g, ''))} placeholder="0" className="h-9 w-14 text-center" aria-label="Minutes" />
          <span className="pb-2 text-xs text-muted-foreground">m</span>
        </div>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you work on?" className="h-9 min-w-40 flex-1" />
        <Button type="submit" size="sm" loading={pending}>
          {!pending && <Plus className="size-4" />}
          Log time
        </Button>
      </form>

      {loading ? (
        <p className="py-3 text-center text-sm text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">No time logged yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/40">
          {entries.map((t) => (
            <li key={t.id} className="group flex items-center gap-3 py-2.5">
              <span className="w-16 shrink-0 text-sm font-semibold tabular-nums text-primary">
                {human(t.minutes)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm">{t.note || 'Time entry'}</span>
                <span className="text-xs text-muted-foreground">
                  {t.userName ?? 'Someone'} · {fmt(t.spentAt)}
                </span>
              </div>
              <button
                onClick={() => remove(t.id)}
                disabled={busyId === t.id}
                className="group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer hover:bg-muted aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg text-muted-foreground hover:text-danger"
                aria-label="Delete entry"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
