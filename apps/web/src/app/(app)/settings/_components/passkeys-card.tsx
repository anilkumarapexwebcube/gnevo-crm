'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, KeyRound, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Passkey {
  id: string;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export function PasskeysCard() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/passkey');
      setPasskeys(res.ok ? await res.json() : []);
    } catch {
      setPasskeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addPasskey() {
    setAdding(true);
    try {
      const optRes = await fetch('/api/auth/passkey/register/options', { method: 'POST' });
      if (!optRes.ok) throw new Error('options');
      const { options, state } = (await optRes.json()) as { options: unknown; state: string };
      const attestation = await startRegistration({ optionsJSON: options as never });
      const name =
        typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent)
          ? 'Windows device'
          : 'This device';
      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: attestation, state, name }),
      });
      if (verifyRes.ok) {
        toast.success('Passkey added');
        await load();
      } else {
        const body = (await verifyRes.json().catch(() => ({}))) as { detail?: string };
        toast.error(body.detail ?? 'Could not add passkey');
      }
    } catch (e) {
      // User cancelled or no authenticator.
      if ((e as Error).name !== 'NotAllowedError') toast.error('Passkey setup was cancelled');
    } finally {
      setAdding(false);
    }
  }

  function remove(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const res = await fetch(`/api/auth/passkey/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPasskeys((prev) => prev.filter((p) => p.id !== id));
        toast.success('Passkey removed');
      } else {
        toast.error('Could not remove passkey');
      }
      setBusyId(null);
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Fingerprint className="size-4" />
          </div>
          <h2 className="text-sm font-semibold">Passkeys</h2>
        </div>
        <Button variant="outline" size="sm" onClick={addPasskey} loading={adding}>
          {!adding && <KeyRound className="size-4" />}
          Add passkey
        </Button>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        Use your device&apos;s fingerprint, face or PIN as a second factor when signing in.
      </p>

      {loading ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
      ) : passkeys.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No passkeys yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/40">
          {passkeys.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                <Fingerprint className="size-4" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{p.name ?? 'Passkey'}</span>
                <span className="text-xs text-muted-foreground">
                  Added {fmt(p.createdAt)}
                  {p.lastUsedAt ? ` · last used ${fmt(p.lastUsedAt)}` : ''}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-danger"
                loading={busyId === p.id}
                onClick={() => remove(p.id)}
                aria-label="Remove passkey"
              >
                {busyId !== p.id && <Trash2 className="size-4" />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
