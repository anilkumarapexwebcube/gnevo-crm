'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Users, Building2, Percent, TrendingUp, Trophy, DollarSign, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface BiData {
  kpis: {
    leads: number;
    customers: number;
    conversionRate: number;
    pipelineValue: number;
    wonValue: number;
    paidRevenue: number;
    avgDealSize: number;
  };
  funnel: { key: string; value: number }[];
  trend: { key: string; leads: number; revenue: number }[];
  topCustomers: { key: string; value: number }[];
  dealsByStage: { key: string; count: number; value: number }[];
}

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const FUNNEL_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#10b981'];
const tooltipStyle = { borderRadius: 12, fontSize: 12, border: '1px solid var(--border)', background: 'var(--card)' };

export function BiDashboard({ data }: { data: BiData }) {
  const k = data.kpis;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={Users} label="Leads" value={`${k.leads}`} />
        <Kpi icon={Building2} label="Customers" value={`${k.customers}`} />
        <Kpi icon={Percent} label="Conversion" value={`${k.conversionRate}%`} accent="text-emerald-600 dark:text-emerald-400" />
        <Kpi icon={Target} label="Pipeline" value={money(k.pipelineValue)} />
        <Kpi icon={Trophy} label="Won value" value={money(k.wonValue)} accent="text-violet-600 dark:text-violet-400" />
        <Kpi icon={DollarSign} label="Paid revenue" value={money(k.paidRevenue)} accent="text-emerald-600 dark:text-emerald-400" />
        <Kpi icon={TrendingUp} label="Avg deal" value={money(k.avgDealSize)} />
        <Kpi icon={Target} label="Deals total" value={`${data.funnel.find((f) => f.key === 'Deals')?.value ?? 0}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Conversion funnel">
          <BarChart data={data.funnel} layout="vertical" margin={{ left: 20, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
            <YAxis type="category" dataKey="key" tick={{ fontSize: 12 }} width={80} stroke="currentColor" className="text-muted-foreground" />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.funnel.map((_, i) => (
                <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Leads vs revenue (6 mo)">
          <ComposedChart data={data.trend} margin={{ left: -12, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="key" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
            <YAxis yAxisId="l" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
            <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar yAxisId="l" dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Line yAxisId="r" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ChartCard>

        <ChartCard title="Top customers by revenue">
          {data.topCustomers.length === 0 ? (
            <Empty />
          ) : (
            <BarChart data={data.topCustomers} layout="vertical" margin={{ left: 20, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
              <YAxis type="category" dataKey="key" tick={{ fontSize: 11 }} width={90} stroke="currentColor" className="text-muted-foreground" />
              <Tooltip formatter={(v: number) => money(v)} contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} />
            </BarChart>
          )}
        </ChartCard>

        <ChartCard title="Deals by stage (value)">
          <BarChart data={data.dealsByStage} margin={{ left: -12, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="key" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
            <Tooltip formatter={(v: number) => money(v)} contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: string; accent?: string }) {
  return (
    <Card className="flex items-center gap-3 rounded-2xl border-0 p-4 shadow-sm ring-1 ring-border/50">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`truncate text-lg font-bold text-foreground ${accent ?? ''}`}>{value}</p>
      </div>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card className="rounded-2xl border-0 p-4 shadow-sm ring-1 ring-border/50">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function Empty() {
  return <div className="grid h-full place-items-center text-sm text-muted-foreground">No data yet.</div>;
}
