'use client';

import { useState, useTransition } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LineChart as LineIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getKeywordHistory, type KeywordHistoryPoint } from '../../actions';

export function KeywordHistoryDialog({ id, term }: { id: string; term: string }) {
  const [open, setOpen] = useState(false);
  const [points, setPoints] = useState<KeywordHistoryPoint[]>([]);
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      startTransition(async () => setPoints(await getKeywordHistory(id)));
    }
  }

  const data = points.map((p) => ({
    date: new Date(p.capturedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    position: p.position,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onOpenChange(true)}
        title="Rank history"
        aria-label="Rank history"
      >
        <LineIcon className="size-4" />
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rank history · {term}</DialogTitle>
        </DialogHeader>
        {pending ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No snapshots yet. Capture one with the Snapshot button (daily snapshots run automatically).
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                {/* Lower position = better, so invert the axis. */}
                <YAxis reversed allowDecimals={false} tick={{ fontSize: 12 }} domain={[1, 'auto']} />
                <Tooltip
                  formatter={(v: number) => [`#${v}`, 'Position']}
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--border)' }}
                />
                <Line
                  type="monotone"
                  dataKey="position"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
