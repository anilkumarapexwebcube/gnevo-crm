'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Point {
  name: string;
  value: number;
}

export function PipelineChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.5} />
        <XAxis
          dataKey="name"
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: 'var(--color-border)', opacity: 0.5 }}
        />
        <YAxis
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
          contentStyle={{
            background: 'color-mix(in srgb, var(--color-popover) 85%, transparent)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--color-popover-foreground)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
          formatter={(v: number) => [`$${v.toLocaleString()}`, 'Value']}
        />
        <Bar dataKey="value" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
