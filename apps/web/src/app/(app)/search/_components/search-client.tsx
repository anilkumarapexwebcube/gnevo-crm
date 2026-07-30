'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Search,
  RefreshCw,
  Building2,
  Users,
  Handshake,
  LifeBuoy,
  BookOpen,
  StickyNote,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { semanticSearch, reindexRag, type RagResult } from '@/lib/rag-actions';

const TYPE_META: Record<string, { icon: typeof Users; label: string; color: string }> = {
  lead: { icon: Users, label: 'Lead', color: 'text-blue-600 bg-blue-100 dark:bg-blue-500/15 dark:text-blue-400' },
  customer: { icon: Building2, label: 'Customer', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400' },
  deal: { icon: Handshake, label: 'Deal', color: 'text-violet-600 bg-violet-100 dark:bg-violet-500/15 dark:text-violet-400' },
  ticket: { icon: LifeBuoy, label: 'Ticket', color: 'text-amber-600 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400' },
  article: { icon: BookOpen, label: 'Article', color: 'text-sky-600 bg-sky-100 dark:bg-sky-500/15 dark:text-sky-400' },
  note: { icon: StickyNote, label: 'Note', color: 'text-slate-600 bg-slate-100 dark:bg-slate-500/15 dark:text-slate-300' },
};

export function SearchClient({ initialIndexed, configured }: { initialIndexed: number; configured: boolean }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<RagResult[] | null>(null);
  const [indexed, setIndexed] = useState(initialIndexed);
  const [searching, startSearch] = useTransition();
  const [reindexing, setReindexing] = useState(false);

  function run() {
    const query = q.trim();
    if (!query) return;
    startSearch(async () => {
      const res = await semanticSearch(query);
      if (!res.ok) {
        toast.error(res.error ?? 'Search failed');
        setResults([]);
        return;
      }
      setIndexed(res.indexed);
      setResults(res.results);
    });
  }

  async function reindex() {
    setReindexing(true);
    const res = await reindexRag();
    setReindexing(false);
    if (res.ok) {
      setIndexed(res.indexed ?? 0);
      toast.success(`Indexed ${res.indexed ?? 0} records`);
    } else {
      toast.error(res.error ?? 'Reindex failed');
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <Sparkles className="size-7 text-primary" />
            AI Search
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Semantic search across leads, customers, deals, tickets, notes &amp; articles.
            {indexed > 0 && ` ${indexed} records indexed.`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reindex} loading={reindexing}>
          {!reindexing && <RefreshCw className="size-4" />}
          Reindex
        </Button>
      </div>

      {!configured && (
        <Card className="rounded-xl border-0 bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
          Semantic search needs an embedding provider. Add <span className="font-mono text-xs">OPENAI_API_KEY</span> or{' '}
          <span className="font-mono text-xs">GOOGLE_AI_API_KEY</span> to <span className="font-mono text-xs">.env</span>, then click Reindex.
        </Card>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="Ask anything — e.g. “clients unhappy about billing” or “enterprise deals in progress”"
          className="h-14 rounded-2xl pl-12 pr-28 text-base shadow-sm"
        />
        <Button onClick={run} loading={searching} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl">
          Search
        </Button>
      </div>

      {results !== null && (
        <div className="flex flex-col gap-2">
          {results.length === 0 ? (
            <Card className="rounded-2xl border-0 p-10 text-center ring-1 ring-border/50">
              <Search className="mx-auto mb-3 size-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No matches found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {indexed === 0 ? 'Nothing is indexed yet — click Reindex first.' : 'Try different wording.'}
              </p>
            </Card>
          ) : (
            results.map((r, i) => {
              const meta = TYPE_META[r.entityType] ?? TYPE_META.note!;
              const Icon = meta.icon;
              return (
                <motion.div key={`${r.entityType}-${r.entityId}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link href={r.link} className="group flex items-start gap-3 rounded-2xl border border-border/50 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm">
                    <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', meta.color)}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{r.title}</span>
                        <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0 text-[10px] font-medium text-muted-foreground">{meta.label}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.snippet}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-bold text-primary">
                        {Math.round(r.score * 100)}%
                      </span>
                      <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </Link>
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
