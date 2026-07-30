'use client';

import { useEffect, useState } from 'react';
import { History, Monitor } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getLoginHistory, type LoginHistoryEntry } from '../actions';

function shortDevice(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'Device';
  const br = /Edg/.test(ua) ? 'Edge' : /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Browser';
  return `${br} · ${os}`;
}

export function LoginHistoryCard() {
  const [rows, setRows] = useState<LoginHistoryEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getLoginHistory().then((r) => { setRows(r); setReady(true); });
  }, []);

  return (
    <Card className="rounded-2xl p-6 shadow-sm ring-1 ring-border/50">
      <div className="mb-1 flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary"><History className="size-4" /></div>
        <h2 className="text-sm font-semibold">Recent sign-ins</h2>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">Your last 20 sign-ins. Spot anything you don&apos;t recognise? Change your password.</p>
      {!ready ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No sign-in history yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/40">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><Monitor className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{shortDevice(r.userAgent)}</p>
                <p className="text-xs text-muted-foreground">{r.ip && r.ip !== '::1' && r.ip !== '127.0.0.1' ? r.ip : 'Local network'}</p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(r.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
