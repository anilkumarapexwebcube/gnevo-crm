'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Webhook,
  Plus,
  Trash2,
  Send,
  RefreshCw,
  Pencil,
  Copy,
  Check,
  ChevronDown,
  History,
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
  getWebhooks,
  createWebhook,
  updateWebhook,
  toggleWebhook,
  regenerateWebhookSecret,
  testWebhook,
  deleteWebhook,
  getWebhookDeliveries,
  type WebhookRow,
  type WebhookDelivery,
} from '../actions';

const EVENTS = [
  'lead.created',
  'customer.created',
  'deal.created',
  'deal.stage_changed',
  'task.completed',
];
const SAMPLE: Record<string, Record<string, unknown>> = {
  'lead.created': { leadId: 'uuid', name: 'Jane Doe' },
  'customer.created': { customerId: 'uuid', name: 'Acme Inc' },
  'deal.created': { dealId: 'uuid', title: 'New retainer' },
  'deal.stage_changed': { dealId: 'uuid', stageName: 'Won' },
  'task.completed': { taskId: 'uuid', title: 'Publish blog' },
};

function isValidUrl(u: string) {
  try {
    const p = new URL(u);
    return p.protocol === 'http:' || p.protocol === 'https:';
  } catch {
    return false;
  }
}

export function WebhooksManager() {
  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [, startTransition] = useTransition();

  // dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookRow | null>(null);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // per-card expanded deliveries
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    // No skeleton flash on refetch — only the initial load shows skeletons.
    setHooks(await getWebhooks());
    setInitializing(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setUrl('');
    setEvents([]);
    setSecret(null);
    setOpen(true);
  }
  function openEdit(h: WebhookRow) {
    setEditing(h);
    setUrl(h.url);
    setEvents(h.events);
    setSecret(null);
    setOpen(true);
  }
  function toggleEvent(ev: string) {
    setEvents((p) => (p.includes(ev) ? p.filter((x) => x !== ev) : [...p, ev]));
  }

  function save() {
    if (!isValidUrl(url.trim())) {
      toast.error('Enter a valid http(s) URL');
      return;
    }
    setSaving(true);
    startTransition(async () => {
      const res = editing
        ? await updateWebhook(editing.id, { url: url.trim(), events })
        : await createWebhook(url.trim(), events);
      setSaving(false);
      if (res.ok) {
        if (!editing && 'secret' in res) setSecret((res as { secret?: string }).secret ?? null);
        toast.success(editing ? 'Webhook updated' : 'Webhook created');
        if (editing) setOpen(false);
        await load();
      } else {
        toast.error(res.error ?? 'Could not save');
      }
    });
  }

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(msg);
      else toast.error(res.error ?? 'Failed');
      await load();
    });
  }

  function regenerate(id: string) {
    startTransition(async () => {
      const res = await regenerateWebhookSecret(id);
      if (res.ok && res.secret) {
        setEditing(hooks.find((h) => h.id === id) ?? null);
        setSecret(res.secret);
        setOpen(true);
        toast.success('New secret generated');
      } else {
        toast.error(res.error ?? 'Failed');
      }
    });
  }

  async function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    setDeliveries(await getWebhookDeliveries(id));
  }

  function copyCurl(h: WebhookRow) {
    const ev = h.events[0] ?? 'lead.created';
    const body = JSON.stringify({ event: ev, data: SAMPLE[ev] ?? {}, timestamp: new Date().toISOString() });
    const curl = `curl -X POST ${h.url} \\\n  -H 'content-type: application/json' \\\n  -H 'x-gnevo-event: ${ev}' \\\n  -H 'x-gnevo-signature: sha256=<hmac-sha256 of body with your secret>' \\\n  -d '${body}'`;
    navigator.clipboard.writeText(curl).catch(() => undefined);
    toast.success('Sample cURL copied');
  }

  const statusStyle = (h: WebhookRow) =>
    h.lastStatus == null
      ? 'bg-slate-100 text-slate-600 border-slate-200'
      : h.lastStatus >= 200 && h.lastStatus < 300
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400'
      : 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400';

  const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Webhook className="size-4" />
          </div>
          Webhooks
        </h2>
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" />
          Add webhook
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Signed (HMAC-SHA256, header <span className="font-mono text-xs">X-Gnevo-Signature</span>), auto-retried
        with exponential backoff. Empty events = all.
      </p>

      {initializing ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : hooks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-10 text-center">
          <Webhook className="size-6 text-muted-foreground/40" />
          <p className="text-sm font-medium">No webhooks yet</p>
          <p className="text-xs text-muted-foreground">Add an endpoint to receive real-time events.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {hooks.map((h) => (
              <motion.li
                key={h.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="rounded-xl border border-border/50 p-3"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-mono text-xs text-foreground">{h.url}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={statusStyle(h)}>
                        {h.lastStatus == null ? 'not fired' : h.lastStatus === 0 ? 'network error' : `HTTP ${h.lastStatus}`}
                      </Badge>
                      {h.failureCount > 0 && (
                        <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400">
                          {h.failureCount} failed
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {h.events.length ? h.events.join(', ') : 'all events'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      role="switch"
                      aria-checked={h.active}
                      aria-label={h.active ? 'Disable' : 'Enable'}
                      onClick={() => act(() => toggleWebhook(h.id), h.active ? 'Disabled' : 'Enabled')}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${h.active ? 'bg-primary' : 'bg-secondary'}`}
                    >
                      <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${h.active ? 'left-[1.125rem]' : 'left-0.5'}`} />
                    </button>
                    <Button variant="ghost" size="icon-sm" onClick={() => act(() => testWebhook(h.id), 'Test queued')} aria-label="Send test">
                      <Send className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => copyCurl(h)} aria-label="Copy cURL">
                      <Copy className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => regenerate(h.id)} aria-label="Regenerate secret">
                      <RefreshCw className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(h)} aria-label="Edit">
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-danger" onClick={() => act(() => deleteWebhook(h.id), 'Deleted')} aria-label="Delete">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <button
                  onClick={() => toggleExpand(h.id)}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
                >
                  <History className="size-3.5" />
                  Delivery history
                  <ChevronDown className={`size-3.5 transition-transform ${expanded === h.id ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {expanded === h.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      {deliveries.length === 0 ? (
                        <p className="py-3 text-center text-xs text-muted-foreground">No deliveries yet.</p>
                      ) : (
                        <ul className="mt-2 flex flex-col divide-y divide-border/40">
                          {deliveries.map((d) => (
                            <li key={d.id} className="flex items-center gap-2 py-2 text-xs">
                              <Badge
                                variant="outline"
                                className={
                                  d.ok
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400'
                                    : 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400'
                                }
                              >
                                {d.statusCode ?? 'ERR'}
                              </Badge>
                              <span className="font-mono">{d.event}</span>
                              <span className="text-muted-foreground">· {d.responseTimeMs ?? '—'}ms · try {d.attempt}</span>
                              <span className="ml-auto text-muted-foreground">{fmt(d.createdAt)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit webhook' : 'New webhook'}</DialogTitle>
          </DialogHeader>

          {secret && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="mb-2 text-sm font-medium">Signing secret (shown once):</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 font-mono text-xs">{secret}</code>
                <Button variant="outline" size="icon-sm" onClick={() => { navigator.clipboard.writeText(secret).catch(() => undefined); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
          )}

          {!secret && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wh-url">Endpoint URL</Label>
                <Input id="wh-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.com/webhook" />
                {url && !isValidUrl(url) && <p className="text-xs text-danger">Enter a valid http(s) URL.</p>}
              </div>
              <div className="grid gap-2">
                <Label>Events</Label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENTS.map((ev) => (
                    <button
                      key={ev}
                      type="button"
                      onClick={() => toggleEvent(ev)}
                      className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-colors ${events.includes(ev) ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground hover:bg-secondary/50'}`}
                    >
                      {ev}
                    </button>
                  ))}
                </div>
              </div>
              {events.length > 0 && (
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Payload preview ({events[0]})</Label>
                  <pre className="max-h-40 overflow-auto rounded-lg border border-border/50 bg-secondary/30 p-3 text-[11px] leading-relaxed">
{JSON.stringify({ event: events[0], data: SAMPLE[events[0]!] ?? {}, timestamp: '2026-01-01T00:00:00.000Z' }, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {secret ? 'Done' : 'Cancel'}
            </Button>
            {!secret && (
              <Button onClick={save} loading={saving} disabled={!isValidUrl(url)}>
                {editing ? 'Save changes' : 'Create webhook'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
