'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Swords, Plus, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { listCompetitors, addCompetitor, deleteCompetitor, type Competitor } from '../../actions';

export function CompetitorsPanel({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await listCompetitors(projectId));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    startTransition(async () => {
      const res = await addCompetitor({ seoProjectId: projectId, name: name.trim(), url: url.trim() });
      if (res.ok) {
        setName('');
        setUrl('');
        await load();
      } else {
        toast.error(res.error ?? 'Could not add');
      }
    });
  }

  function remove(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const res = await deleteCompetitor(id);
      if (res.ok) setItems((prev) => prev.filter((c) => c.id !== id));
      setBusyId(null);
    });
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Swords className="size-4 text-muted-foreground" />
        Competitors
      </h2>

      <form onSubmit={add} className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-border/50 p-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Competitor name" className="h-9 w-40" />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="example.com" className="h-9 min-w-40 flex-1" />
        <Button type="submit" size="sm" loading={pending}>
          {!pending && <Plus className="size-4" />}
          Add
        </Button>
      </form>

      {loading ? (
        <p className="py-3 text-center text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">No competitors tracked yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/40">
          {items.map((c) => (
            <li key={c.id} className="group flex items-center gap-3 py-2.5">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{c.name}</span>
                <a
                  href={/^https?:\/\//.test(c.url) ? c.url : `https://${c.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 truncate text-xs text-primary hover:underline"
                >
                  <ExternalLink className="size-3" />
                  {c.url}
                </a>
              </div>
              <button
                onClick={() => remove(c.id)}
                disabled={busyId === c.id}
                className="text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 cursor-pointer"
                aria-label="Remove competitor"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
