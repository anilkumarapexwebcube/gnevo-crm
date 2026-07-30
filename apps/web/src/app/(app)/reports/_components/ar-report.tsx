'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ArData {
  totals: { outstanding: number; overdue: number; collected: number; openInvoices: number };
  aging: { key: string; count: number; value: number }[];
  trend: { key: string; billed: number; collected: number }[];
}

const AGING_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];
const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function ArReport({ data }: { data: ArData }) {
  const t = data.totals;
  return (
    <Card className="flex flex-col gap-5 rounded-2xl border-0 p-6 shadow-sm ring-1 ring-border/50">
      <div>
        <h2 className="text-lg font-bold text-foreground">Revenue &amp; Accounts Receivable</h2>
        <p className="text-sm text-muted-foreground">Outstanding balance, aging, and billed-vs-collected trend.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Outstanding" value={money(t.outstanding)} />
        <Kpi label="Overdue" value={money(t.overdue)} className={t.overdue > 0 ? 'text-rose-600 dark:text-rose-400' : undefined} />
        <Kpi label="Collected" value={money(t.collected)} className="text-emerald-600 dark:text-emerald-400" />
        <Kpi label="Open invoices" value={`${t.openInvoices}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">AR aging</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.aging} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="key" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip
                  formatter={(v: number) => money(v)}
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid var(--border)', background: 'var(--card)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.aging.map((_, i) => (
                    <Cell key={i} fill={AGING_COLORS[i % AGING_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Billed vs collected (6 mo)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="key" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip
                  formatter={(v: number) => money(v)}
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid var(--border)', background: 'var(--card)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="billed" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Kpi({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('text-xl font-bold text-foreground', className)}>{value}</p>
    </div>
  );
}
