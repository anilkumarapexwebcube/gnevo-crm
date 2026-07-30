'use client';

import { useEffect, useState, useTransition } from 'react';
import { Plus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  listContent,
  createContent,
  updateContent,
  deleteContent,
  type ContentItem,
} from '@/lib/crm-actions';

const STAGES = [
  { key: 'idea', label: 'Ideas' },
  { key: 'writing', label: 'Writing' },
  { key: 'review', label: 'Review' },
  { key: 'published', label: 'Published' },
];
const ORDER = STAGES.map((s) => s.key);

export function ContentBoard() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    setItems(await listContent());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await createContent({ title: title.trim(), dueDate: due || undefined });
      if (res.ok) {
        setTitle('');
        setDue('');
        await load();
      } else {
        toast.error(res.error ?? 'Could not add');
      }
    });
  }

  function move(item: ContentItem, dir: 1 | -1) {
    const idx = ORDER.indexOf(item.status);
    const next = ORDER[Math.min(ORDER.length - 1, Math.max(0, idx + dir))]!;
    if (next === item.status) return;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
    startTransition(() => updateContent(item.id, { status: next }).then(() => undefined));
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(() => deleteContent(id).then(() => undefined));
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={add} className="flex flex-wrap items-end gap-2 rounded-xl border border-border/50 bg-card p-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content idea / title" className="h-9 min-w-48 flex-1" />
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-9 w-40" aria-label="Due date" />
        <Button type="submit" size="sm">
          <Plus className="size-4" />
          Add
        </Button>
      </form>

      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          {STAGES.map((stage) => {
            const col = items.filter((i) => i.status === stage.key);
            return (
              <div key={stage.key} className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-bold text-foreground">{stage.label}</span>
                  <span className="grid min-w-6 place-items-center rounded-full border border-primary/20 bg-primary/10 px-2 text-xs font-bold text-primary">
                    {col.length}
                  </span>
                </div>
                <div className="flex min-h-24 flex-col gap-2 rounded-xl border border-border/40 bg-muted/20 p-2">
                  {col.map((i) => {
                    const idx = ORDER.indexOf(i.status);
                    return (
                      <Card key={i.id} className="group gap-2 p-3">
                        <p className="text-sm font-medium text-foreground">{i.title}</p>
                        {i.dueDate && (
                          <p className="text-xs text-muted-foreground">Due {fmt(i.dueDate)}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon-xs" disabled={idx === 0} onClick={() => move(i, -1)} aria-label="Move back">
                              <ChevronLeft className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-xs" disabled={idx === ORDER.length - 1} onClick={() => move(i, 1)} aria-label="Move forward">
                              <ChevronRight className="size-3.5" />
                            </Button>
                          </div>
                          <button
                            onClick={() => remove(i.id)}
                            className="text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 cursor-pointer"
                            aria-label="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                  {col.length === 0 && (
                    <p className="py-3 text-center text-xs text-muted-foreground/60">Empty</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
