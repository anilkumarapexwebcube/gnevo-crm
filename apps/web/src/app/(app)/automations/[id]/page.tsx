import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Info } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ACTION_DESCRIPTIONS,
  ACTION_LABELS,
  TRIGGER_DESCRIPTIONS,
  TRIGGER_LABELS,
} from '../_lib/labels';

interface ActionResult {
  type: string;
  ok: boolean;
  note?: string;
  output?: string;
}
interface Run {
  id: string;
  status: string;
  error: string | null;
  createdAt: string;
  context: { results?: ActionResult[] };
}
interface Automation {
  id: string;
  name: string;
  triggerType: string;
  isActive: boolean;
  definition: { actions?: { type: string; config: string }[] };
  runs: Run[];
}

const STATUS_STYLES: Record<string, string> = {
  success: 'text-success border-success/30 bg-success/10',
  pending: 'text-warning border-warning/30 bg-warning/10',
  failed: 'text-danger border-danger/30 bg-danger/10',
};

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let automation: Automation;
  try {
    automation = await apiServer<Automation>(`/v1/automations/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Button
        nativeButton={false}
        render={<Link href="/automations" />}
        variant="ghost"
        size="sm"
        className="w-fit"
      >
        <ArrowLeft />
        Back to automations
      </Button>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{automation.name}</h1>
        <Badge variant="outline">{automation.isActive ? 'Active' : 'Paused'}</Badge>
      </div>

      <Card className="gap-3 p-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">When</span>
          <Tooltip>
            <TooltipTrigger
              render={<Badge variant="secondary">{TRIGGER_LABELS[automation.triggerType] ?? automation.triggerType}</Badge>}
            />
            <TooltipContent>
              {TRIGGER_DESCRIPTIONS[automation.triggerType] ?? 'Trigger event'}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Then</span>
          <ul className="flex flex-col gap-1.5">
            {(automation.definition?.actions ?? []).map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Tooltip>
                  <TooltipTrigger
                    render={<Badge variant="outline">{ACTION_LABELS[a.type] ?? a.type}</Badge>}
                  />
                  <TooltipContent>{ACTION_DESCRIPTIONS[a.type] ?? 'Action'}</TooltipContent>
                </Tooltip>
                {a.config && <span className="text-muted-foreground">{a.config}</span>}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <h2 className="text-sm font-semibold">Runs ({automation.runs.length})</h2>
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="text-muted-foreground">
                  <Info className="size-3.5" />
                </span>
              }
            />
            <TooltipContent>
              Each run shows what every action did. AI output appears inline.
            </TooltipContent>
          </Tooltip>
        </div>

        {automation.runs.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No runs yet. Activate the automation and fire its trigger.
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {automation.runs.map((run) => (
              <Card key={run.id} className="gap-2 p-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={STATUS_STYLES[run.status] ?? ''}>
                    {run.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                </div>
                {run.error && <p className="text-xs text-danger">{run.error}</p>}
                {(run.context?.results ?? []).map((r, i) => (
                  <div key={i} className="rounded-md border bg-muted/30 p-2 text-xs">
                    <span className="font-medium">{ACTION_LABELS[r.type] ?? r.type}</span>{' '}
                    {r.ok ? (
                      <span className="text-success">done</span>
                    ) : (
                      <span className="text-danger">failed</span>
                    )}
                    {r.note && <span className="text-muted-foreground"> · {r.note}</span>}
                    {r.output && (
                      <p className="mt-1 whitespace-pre-wrap text-foreground">{r.output}</p>
                    )}
                  </div>
                ))}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
