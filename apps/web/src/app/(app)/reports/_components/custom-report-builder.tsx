'use client';

import { useState, useTransition } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Download, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { runCustomReport, type CustomReportResult } from '../actions';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#f97316'];

// Source → allowed group-by dimensions and metrics.
const SOURCES: Record<
  string,
  { label: string; groupBy: { value: string; label: string }[]; metrics: { value: string; label: string }[] }
> = {
  leads: {
    label: 'Leads',
    groupBy: [
      { value: 'status', label: 'Status' },
      { value: 'source', label: 'Source' },
    ],
    metrics: [{ value: 'count', label: 'Count' }],
  },
  customers: {
    label: 'Customers',
    groupBy: [
      { value: 'status', label: 'Status' },
      { value: 'type', label: 'Type' },
    ],
    metrics: [{ value: 'count', label: 'Count' }],
  },
  deals: {
    label: 'Deals',
    groupBy: [
      { value: 'stage', label: 'Stage' },
      { value: 'status', label: 'Status' },
    ],
    metrics: [
      { value: 'count', label: 'Count' },
      { value: 'sum', label: 'Sum of value' },
    ],
  },
  invoices: {
    label: 'Invoices',
    groupBy: [{ value: 'status', label: 'Status' }],
    metrics: [
      { value: 'count', label: 'Count' },
      { value: 'sum', label: 'Sum of total' },
    ],
  },
};

export function CustomReportBuilder() {
  const [source, setSource] = useState('leads');
  const [groupBy, setGroupBy] = useState('status');
  const [metric, setMetric] = useState('count');
  const [result, setResult] = useState<CustomReportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const cfg = SOURCES[source]!;

  function onSourceChange(v: string) {
    const next = SOURCES[v]!;
    setSource(v);
    setGroupBy(next.groupBy[0]!.value);
    if (!next.metrics.some((m) => m.value === metric)) setMetric(next.metrics[0]!.value);
  }

  function run() {
    startTransition(async () => {
      const res = await runCustomReport({ source, groupBy, metric });
      if (res.ok && res.data) setResult(res.data);
      else toast.error(res.error ?? 'Could not run report');
    });
  }

  function exportCsv() {
    if (!result) return;
    const header = `Label,${result.valueLabel}`;
    const lines = result.rows.map((r) => `"${r.label.replace(/"/g, '""')}",${r.value}`);
    const blob = new Blob([[header, ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${source}-by-${groupBy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sel = (
    value: string,
    onChange: (v: string) => void,
    items: { value: string; label: string }[],
    id: string,
  ) => (
    <Select items={items} value={value} onValueChange={(v) => onChange(v ?? items[0]!.value)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const isMoney = metric === 'sum' && (source === 'invoices' || source === 'deals');
  const fmtVal = (v: number) =>
    isMoney ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(v) : String(v);

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex items-center gap-2">
        <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <BarChart3 className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Custom report builder</h2>
          <p className="text-xs text-muted-foreground">Pick a source, dimension and metric.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="grid gap-2">
          <Label htmlFor="src">Data source</Label>
          {sel(
            source,
            onSourceChange,
            Object.entries(SOURCES).map(([v, c]) => ({ value: v, label: c.label })),
            'src',
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="grp">Group by</Label>
          {sel(groupBy, setGroupBy, cfg.groupBy, 'grp')}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="met">Metric</Label>
          {sel(metric, setMetric, cfg.metrics, 'met')}
        </div>
        <div className="flex items-end">
          <Button onClick={run} loading={pending} className="w-full">
            {!pending && <Play className="size-4" />}
            Run report
          </Button>
        </div>
      </div>

      {result && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {cfg.label} by {cfg.groupBy.find((g) => g.value === groupBy)?.label} ·{' '}
              {result.valueLabel}
            </span>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={result.rows.length === 0}>
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>

          {result.rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No data for this selection.</p>
          ) : (
            <>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.rows} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={!isMoney} />
                    <Tooltip
                      formatter={(v: number) => fmtVal(v)}
                      contentStyle={{ borderRadius: 12, border: '1px solid var(--border)' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {result.rows.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-hidden rounded-xl border border-border/50">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Label</th>
                      <th className="px-4 py-2 text-right font-medium">{result.valueLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r) => (
                      <tr key={r.label} className="border-t border-border/40 hover:bg-primary/5">
                        <td className="px-4 py-2">{r.label}</td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums">
                          {fmtVal(r.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
