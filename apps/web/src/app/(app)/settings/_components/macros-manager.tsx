'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquareText,
  Plus,
  Search,
  Trash2,
  Copy,
  Pencil,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/rich-text-editor';
import { askAi } from '@/app/(app)/ai/actions';
import {
  listMacros,
  createMacro,
  updateMacro,
  deleteMacro,
  duplicateMacro,
  reorderMacro,
  type Macro,
} from '@/lib/macros-actions';

const CATEGORIES = ['support', 'sales', 'billing', 'technical', 'custom'];
const FILTERS = ['all', ...CATEGORIES];
const VARIABLES = ['customer_name', 'company_name', 'ticket_id', 'order_id'];

const CAT_STYLE: Record<string, string> = {
  support: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400',
  sales: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400',
  billing: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400',
  technical: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-400',
  custom: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300',
};

export function MacrosManager() {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [, startTransition] = useTransition();

  // Editor dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Macro | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('support');
  const [body, setBody] = useState('');
  const [syncSignal, setSyncSignal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [aiPending, setAiPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query: string, cat: string) => {
    // No skeleton flash on refetch — only the initial load shows skeletons.
    const next = await listMacros(query, cat);
    setMacros(next);
    setInitializing(false);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(q, filter), 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, filter, load]);

  function openNew() {
    setEditing(null);
    setTitle('');
    setCategory('support');
    setBody('');
    setSyncSignal((s) => s + 1);
    setOpen(true);
  }
  function openEdit(m: Macro) {
    setEditing(m);
    setTitle(m.title);
    setCategory(m.category);
    setBody(m.body);
    setSyncSignal((s) => s + 1);
    setOpen(true);
  }

  function insertVar(v: string) {
    setBody((b) => `${b}${b.endsWith('>') || b === '' ? '' : ' '}{{${v}}}`);
    setSyncSignal((s) => s + 1);
  }

  async function aiGenerate() {
    if (!title.trim()) {
      toast.error('Add a title first so the AI knows the topic');
      return;
    }
    setAiPending(true);
    const res = await askAi([
      {
        role: 'user',
        content: `Write a professional, friendly canned support reply for the scenario: "${title.trim()}". 2-4 sentences. Use {{customer_name}} for the greeting where natural. Return only the reply text, no preamble.`,
      },
    ]);
    setAiPending(false);
    if (res.ok && res.text) {
      setBody(`<p>${res.text.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`);
      setSyncSignal((s) => s + 1);
      toast.success('AI draft ready — review & edit');
    } else {
      toast.error(res.error ?? 'AI generation failed');
    }
  }

  function save() {
    if (!title.trim() || !body.trim() || body === '<p></p>') {
      toast.error('Title and body are required');
      return;
    }
    setSaving(true);
    startTransition(async () => {
      const res = editing
        ? await updateMacro(editing.id, { title: title.trim(), body, category })
        : await createMacro({ title: title.trim(), body, category });
      setSaving(false);
      if (res.ok) {
        toast.success(editing ? 'Macro updated' : 'Macro created');
        setOpen(false);
        await load(q, filter);
      } else {
        toast.error(res.error ?? 'Could not save');
      }
    });
  }

  function act(fn: () => Promise<unknown>, msg?: string) {
    startTransition(async () => {
      await fn();
      if (msg) toast.success(msg);
      await load(q, filter);
    });
  }

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'never';

  return (
    <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <MessageSquareText className="size-4" />
          </div>
          Canned replies
        </h2>
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" />
          New macro
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search macros…" className="h-9 pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/60 text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {initializing ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : macros.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-10 text-center">
          <MessageSquareText className="size-6 text-muted-foreground/40" />
          <p className="text-sm font-medium">No macros{q || filter !== 'all' ? ' match' : ' yet'}</p>
          <p className="text-xs text-muted-foreground">Create reusable replies agents can insert on tickets.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {macros.map((m, i) => (
              <motion.li
                key={m.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-3 rounded-xl border border-border/50 p-3"
              >
                <div className="flex flex-col">
                  <button
                    onClick={() => act(() => reorderMacro(m.id, 'up'))}
                    disabled={i === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    onClick={() => act(() => reorderMacro(m.id, 'down'))}
                    disabled={i === macros.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{m.title}</span>
                    <Badge variant="outline" className={`capitalize ${CAT_STYLE[m.category] ?? ''}`}>
                      {m.category}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Used {m.usageCount}× · last {fmt(m.lastUsedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(m)} aria-label="Edit">
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => act(() => duplicateMacro(m.id), 'Duplicated')}
                    aria-label="Duplicate"
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-danger"
                    onClick={() => act(() => deleteMacro(m.id), 'Deleted')}
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit macro' : 'New macro'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="grid gap-2">
                <Label htmlFor="macro-title">Title</Label>
                <Input id="macro-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Refund approved" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="macro-cat">Category</Label>
                <Select
                  items={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  value={category}
                  onValueChange={(v) => setCategory(v ?? 'support')}
                >
                  <SelectTrigger id="macro-cat" className="w-full capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Body</Label>
                <Button type="button" variant="outline" size="xs" onClick={aiGenerate} disabled={aiPending}>
                  {aiPending ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                  AI generate
                </Button>
              </div>
              <RichTextEditor
                value={body}
                onChange={setBody}
                syncSignal={syncSignal}
                placeholder="Write the reply…"
                minHeightClass="min-h-40"
              />
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground">Variables:</span>
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVar(v)}
                    className="rounded-md border border-border/60 bg-secondary/40 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-secondary"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? 'Save changes' : 'Create macro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
