'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Users,
  Building2,
  Handshake,
  LifeBuoy,
  Receipt,
  FolderKanban,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Result {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const TYPE_ICON: Record<string, LucideIcon> = {
  lead: Users,
  customer: Building2,
  deal: Handshake,
  ticket: LifeBuoy,
  invoice: Receipt,
  project: FolderKanban,
  article: FileText,
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K / Ctrl+K to open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Debounced search.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const data = (await res.json()) as { results: Result[] };
        setResults(data.results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [q]);

  function go(href: string) {
    setOpen(false);
    setQ('');
    router.push(href as never);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-9 items-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 text-sm font-medium text-foreground/80 transition-colors duration-150 hover:border-border hover:bg-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
      >
        <Search className="size-4 text-muted-foreground" />
        <span>Search</span>
        <kbd className="ml-2 hidden items-center rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="top-24 translate-y-0 gap-0 p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search leads, customers, deals, tickets…"
              autoFocus
              className="h-11 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {q.trim().length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Type to search…</p>
            ) : loading ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Searching…</p>
            ) : results.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No results.</p>
            ) : (
              results.map((r) => {
                const Icon = TYPE_ICON[r.type] ?? Search;
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    type="button"
                    onClick={() => go(r.href)}
                    className="group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary/10"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{r.title}</span>
                        {r.subtitle && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {r.subtitle}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {r.type}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
