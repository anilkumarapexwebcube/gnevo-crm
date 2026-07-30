'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { KeyRound, Copy, Check, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { getApiKeys, createApiKey, revokeApiKey, type ApiKeyRow } from '../actions';

export function ApiKeysCard() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [name, setName] = useState('');
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setKeys(await getApiKeys());
    setInitializing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function create() {
    if (!name.trim()) {
      toast.error('Name the key first');
      return;
    }
    startTransition(async () => {
      const res = await createApiKey(name.trim());
      if (res.ok && res.key) {
        setCreated(res.key);
        setName('');
        toast.success('API key created');
        await load();
      } else {
        toast.error(res.error ?? 'Could not create');
      }
    });
  }

  function revoke(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const res = await revokeApiKey(id);
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
        toast.success('Key revoked');
      } else {
        toast.error(res.error ?? 'Could not revoke');
      }
      setBusyId(null);
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
          <KeyRound className="size-4" />
        </div>
        <h2 className="text-sm font-semibold">API keys</h2>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Use with <span className="font-mono text-xs">X-API-Key</span> or{' '}
        <span className="font-mono text-xs">Authorization: Bearer</span> for programmatic access.
      </p>

      {created && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="mb-2 text-sm font-medium">Copy this key now — it won&apos;t be shown again:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 font-mono text-xs">
              {created}
            </code>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => {
                navigator.clipboard.writeText(created).catch(() => undefined);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-end gap-2">
        <div className="flex-1">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name (e.g. Zapier)" />
        </div>
        <Button onClick={create} loading={pending}>
          <Plus className="size-4" />
          Create key
        </Button>
      </div>

      {initializing ? (
        <p className="py-3 text-center text-sm text-muted-foreground">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">No API keys yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/40">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center gap-3 py-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{k.name}</span>
                <span className="text-xs text-muted-foreground">
                  <span className="font-mono">{k.prefix}…</span> · created {fmt(k.createdAt)}
                  {k.lastUsedAt ? ` · last used ${fmt(k.lastUsedAt)}` : ' · never used'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-danger"
                loading={busyId === k.id}
                onClick={() => revoke(k.id)}
                aria-label="Revoke key"
              >
                {busyId !== k.id && <Trash2 className="size-4" />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
