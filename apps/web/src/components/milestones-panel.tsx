'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Flag, Plus, Check, Trash2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  listMilestones,
  createMilestone,
  toggleMilestone,
  deleteMilestone,
  type Milestone,
} from '@/lib/crm-actions';

export function MilestonesPanel({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await listMilestones(projectId));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const done = items.filter((m) => m.status === 'done').length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await createMilestone({ projectId, title: title.trim(), dueDate: due || undefined });
      if (res.ok) {
        setTitle('');
        setDue('');
        await load();
      } else {
        toast.error(res.error ?? 'Could not add');
      }
    });
  }

  function toggle(m: Milestone) {
    setItems((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, status: x.status === 'done' ? 'open' : 'done' } : x)),
    );
    startTransition(() => toggleMilestone(m.id).then(() => undefined));
  }

  function remove(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const res = await deleteMilestone(id);
      if (res.ok) setItems((prev) => prev.filter((m) => m.id !== id));
      setBusyId(null);
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const overdue = (iso: string) => new Date(iso) < new Date(new Date().toDateString());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Flag className="size-4 text-muted-foreground" />
          Milestones
        </h2>
        {items.length > 0 && (
          <span className="text-xs font-medium text-muted-foreground">
            {done}/{items.length} done
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      <form onSubmit={add} className="flex flex-wrap items-end gap-2 rounded-xl border border-border/50 p-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Milestone (e.g. Launch phase 1)"
          className="h-9 min-w-40 flex-1"
        />
        <Input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="h-9 w-40"
          aria-label="Due date"
        />
        <Button type="submit" size="sm" loading={pending}>
          {!pending && <Plus className="size-4" />}
          Add
        </Button>
      </form>

      {loading ? (
        <p className="py-3 text-center text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">No milestones yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/40">
          {items.map((m) => {
            const isDone = m.status === 'done';
            return (
              <li key={m.id} className="group flex items-center gap-3 py-2.5">
                <button
                  onClick={() => toggle(m)}
                  className={isDone ? 'text-emerald-500' : 'text-muted-foreground hover:text-primary cursor-pointer'}
                  aria-label="Toggle milestone"
                >
                  {isDone ? <Check className="size-5" /> : <Circle className="size-5" />}
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className={`truncate text-sm ${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {m.title}
                  </span>
                  {m.dueDate && (
                    <span
                      className={`text-xs ${
                        !isDone && overdue(m.dueDate) ? 'font-medium text-danger' : 'text-muted-foreground'
                      }`}
                    >
                      Due {fmt(m.dueDate)}
                      {!isDone && overdue(m.dueDate) ? ' · overdue' : ''}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => remove(m.id)}
                  disabled={busyId === m.id}
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 cursor-pointer"
                  aria-label="Delete milestone"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
