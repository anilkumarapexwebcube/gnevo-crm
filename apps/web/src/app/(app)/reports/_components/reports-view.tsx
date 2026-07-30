'use client';

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

const CHART_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#ef4444',
  '#f97316',
];
import { Download, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Bucket {
  key: string;
  count: number;
  value?: number;
}
interface Overview {
  totals: { leads: number; openForecast: number; paidRevenue: number; openTasks: number };
  leadsByStatus: Bucket[];
  leadsBySource: Bucket[];
  dealsByStage: Bucket[];
  invoiceRevenue: Bucket[];
  tasksByStatus: Bucket[];
}

function money(v: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);
}

function exportCsv(name: string, rows: Bucket[], valueLabel: string) {
  const header = `Key,${valueLabel}\n`;
  const body = rows.map((r) => `"${r.key}",${r.value ?? r.count}`).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ChartCard({
  title,
  data,
  dataKey,
  valueLabel,
  currency,
}: {
  title: string;
  data: Bucket[];
  dataKey: 'count' | 'value';
  valueLabel: string;
  currency?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5 rounded-2xl shadow-sm border-0 ring-1 ring-border/50 bg-linear-to-b from-card to-card/50 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="size-4" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
          aria-label={`Export ${title}`}
          onClick={() => exportCsv(title.replace(/\s+/g, '-').toLowerCase(), data, valueLabel)}
        >
          <Download className="size-4" />
        </Button>
      </div>
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
            <TrendingUp className="size-5" />
          </div>
          <p className="text-sm text-muted-foreground">No data available yet.</p>
        </div>
      ) : (
        <div className="flex-1 w-full mt-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.4} />
              <XAxis
                dataKey="key"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                dx={-8}
                tickFormatter={(v: number) => (currency ? `$${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.5 }}
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'hsl(var(--foreground))',
                  padding: '8px 12px'
                }}
                itemStyle={{
                  color: 'hsl(var(--primary))',
                  fontWeight: 600
                }}
                formatter={(v: number) => [currency ? money(v) : v, valueLabel]}
              />
              <Bar
                dataKey={dataKey}
                radius={[6, 6, 0, 0]}
                animationDuration={900}
                animationEasing="ease-out"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export function ReportsView({ data }: { data: Overview }) {
  const kpis = [
    { label: 'Total leads', value: String(data.totals.leads) },
    { label: 'Open forecast', value: money(data.totals.openForecast) },
    { label: 'Paid revenue', value: money(data.totals.paidRevenue) },
    { label: 'Open tasks', value: String(data.totals.openTasks) },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k, _i) => (
          <Card 
            key={k.label} 
            className="group relative overflow-hidden gap-1 p-5 rounded-2xl shadow-sm border-0 ring-1 ring-border/50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:ring-primary/30"
          >
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{k.label}</p>
              <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">{k.value}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Deals by stage" data={data.dealsByStage} dataKey="value" valueLabel="Value" currency />
        <ChartCard title="Revenue by invoice status" data={data.invoiceRevenue} dataKey="value" valueLabel="Revenue" currency />
        <ChartCard title="Leads by status" data={data.leadsByStatus} dataKey="count" valueLabel="Count" />
        <ChartCard title="Leads by source" data={data.leadsBySource} dataKey="count" valueLabel="Count" />
        <ChartCard title="Tasks by status" data={data.tasksByStatus} dataKey="count" valueLabel="Count" />
      </div>
    </div>
  );
}
