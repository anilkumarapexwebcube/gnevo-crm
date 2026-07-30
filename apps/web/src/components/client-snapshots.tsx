'use client';

import { useCallback, useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Camera, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { captureSnapshot, listSnapshots, type ClientSnapshot } from '@/lib/crm-actions';

function healthColor(score: number): string {
  if (score >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

export function ClientSnapshots({ customerId }: { customerId: string }) {
  const [snaps, setSnaps] = useState<ClientSnapshot[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [capturing, setCapturing] = useState(false);

  const load = useCallback(async () => {
    setSnaps(await listSnapshots(customerId));
    setInitializing(false);
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function capture() {
    setCapturing(true);
    const res = await captureSnapshot(customerId);
    setCapturing(false);
    if (res.ok) {
      toast.success('Snapshot captured');
      await load();
    } else toast.error(res.error ?? 'Failed');
  }

  const latest = snaps[snaps.length - 1];
  const chartData = snaps.map((s) => ({
    date: new Date(s.capturedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    health: s.healthScore,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Activity className="size-4 text-muted-foreground" />
          Health snapshots
        </h2>
        <Button variant="outline" size="sm" onClick={capture} loading={capturing}>
          {!capturing && <Camera className="size-4" />}
          Capture now
        </Button>
      </div>

      {initializing ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : snaps.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 py-8 text-center">
          <TrendingUp className="size-5 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No snapshots yet.</p>
          <p className="text-xs text-muted-foreground/70">Capture a snapshot to start tracking this client&apos;s health over time. Auto-captured weekly.</p>
        </div>
      ) : (
        <>
          {latest && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Health" value={`${latest.healthScore}`} className={healthColor(latest.healthScore)} />
              <Metric label="Open deals" value={`${latest.openDeals}`} sub={latest.openDealsValue > 0 ? `$${latest.openDealsValue.toLocaleString()}` : undefined} />
              <Metric label="Paid" value={`$${latest.paidRevenue.toLocaleString()}`} />
              <Metric label="Outstanding" value={`$${latest.outstanding.toLocaleString()}`} className={latest.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : undefined} />
            </div>
          )}
          {chartData.length > 1 && (
            <div className="h-40 rounded-xl border border-border/50 bg-card p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid var(--border)', background: 'var(--card)' }} />
                  <Line type="monotone" dataKey="health" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ label, value, sub, className }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-bold text-foreground', className)}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
