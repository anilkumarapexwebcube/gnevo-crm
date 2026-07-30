'use client';

import { useState, useTransition } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCustomerInsights, type Insights } from '../actions';

const RISK_STYLES: Record<string, string> = {
  low: 'text-success border-success/30 bg-success/10',
  medium: 'text-warning border-warning/30 bg-warning/10',
  high: 'text-danger border-danger/30 bg-danger/10',
};

export function CustomerInsights({ customerId }: { customerId: string }) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const res = await getCustomerInsights(customerId);
      if (res.ok && res.data) setInsights(res.data);
      else toast.error(res.error ?? 'Failed');
    });
  }

  return (
    <Card className="gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" />
          AI insights
        </h2>
        <Button variant="outline" size="sm" onClick={generate} disabled={pending}>
          {pending ? 'Analyzing…' : insights ? 'Refresh' : 'Generate'}
        </Button>
      </div>

      {!insights ? (
        <p className="text-sm text-muted-foreground">
          Generate an AI assessment of churn risk &amp; upsell opportunity from this customer&apos;s
          deals, revenue &amp; tickets.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Churn risk</span>
            <Badge variant="outline" className={RISK_STYLES[insights.churnRisk] ?? ''}>
              {insights.churnRisk}
            </Badge>
          </div>
          {insights.upsell && (
            <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <TrendingUp className="mt-0.5 size-4 shrink-0 text-success" />
              <span>
                <span className="font-medium">Upsell: </span>
                {insights.upsell}
              </span>
            </div>
          )}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{insights.summary}</p>
        </div>
      )}
    </Card>
  );
}
