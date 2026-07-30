'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Monitor, Smartphone, ShieldCheck, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSessions, revokeSession, revokeAllSessions, type SessionInfo } from '../actions';

function parseUa(ua: string | null): { device: string; os: string; browser: string; mobile: boolean } {
  if (!ua) return { device: 'Unknown device', os: '', browser: '', mobile: false };
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let browser = 'Browser';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  let os = 'Unknown OS';
  if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  const device = mobile ? (/Android/i.test(ua) ? 'Android phone' : 'Mobile device') : os;
  return { device, os, browser, mobile };
}

function locationLabel(ip: string | null): string {
  if (!ip) return 'Unknown location';
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.'))
    return 'Local network';
  return ip;
}

export function SessionsManager() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setSessions(await getSessions());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function revoke(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const res = await revokeSession(id);
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        toast.success('Device signed out');
      } else {
        toast.error(res.error ?? 'Could not sign out');
      }
      setBusyId(null);
    });
  }

  function revokeAll() {
    startTransition(async () => {
      const res = await revokeAllSessions();
      if (res.ok) {
        toast.success('Signed out of all devices');
        // Also clears the current cookie + returns to login.
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
        router.push('/login');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Could not sign out');
      }
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  return (
    <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Monitor className="size-4" />
          </div>
          <h2 className="text-sm font-semibold">Active sessions</h2>
        </div>
        {sessions.length > 0 && (
          <Button variant="outline" size="sm" onClick={revokeAll} loading={pending && !busyId}>
            Sign out everywhere
          </Button>
        )}
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No active sessions.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/40">
          {sessions.map((s) => {
            const d = parseUa(s.userAgent);
            const Icon = d.mobile ? Smartphone : Monitor;
            return (
              <li key={s.id} className="flex items-center gap-4 py-4">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-xl ${
                    s.current
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  <Icon className="size-5" />
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {s.current ? 'Current device' : d.device}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {[d.os, d.browser].filter(Boolean).join(' · ') || 'Unknown device'}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    {locationLabel(s.ip)} · signed in {fmt(s.createdAt)}
                  </span>
                </div>

                {s.current ? (
                  <Badge
                    variant="outline"
                    className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
                  >
                    <ShieldCheck className="size-3" />
                    Active
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-danger hover:text-danger"
                    loading={busyId === s.id}
                    onClick={() => revoke(s.id)}
                  >
                    {busyId !== s.id && 'Log out'}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
