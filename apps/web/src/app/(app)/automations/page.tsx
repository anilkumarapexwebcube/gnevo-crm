import { Workflow } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { DetailLink } from '@/components/detail-link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewAutomationDialog } from './_components/new-automation-dialog';
import { AutomationRowActions } from './_components/automation-row-actions';
import { AutomationTemplates } from './_components/automation-templates';
import { TRIGGER_LABELS } from './_lib/labels';

interface AutomationRow {
  id: string;
  name: string;
  triggerType: string;
  isActive: boolean;
  definition: { actions?: { type: string }[] };
  _count: { runs: number };
}

export default async function AutomationsPage() {
  let automations: AutomationRow[] = [];
  let loadError = false;
  try {
    automations = await apiServer<AutomationRow[]>('/v1/automations');
  } catch {
    loadError = true;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automations</h1>
          <p className="text-sm text-muted-foreground">
            {automations.length} {automations.length === 1 ? 'workflow' : 'workflows'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AutomationTemplates />
          <NewAutomationDialog />
        </div>
      </div>

      {loadError ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load automations. Please refresh.
        </Card>
      ) : automations.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Workflow className="size-6" />
          </span>
          <div>
            <p className="font-medium">No automations yet</p>
            <p className="text-sm text-muted-foreground">
              Create a trigger → action workflow to automate busywork.
            </p>
          </div>
          <NewAutomationDialog />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {automations.map((a) => (
            <Card key={a.id} className="flex-row items-center justify-between p-4">
              <div className="flex flex-col gap-1">
                <DetailLink href={`/automations/${a.id}`} tip="View runs & config">
                  {a.name}
                </DetailLink>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{TRIGGER_LABELS[a.triggerType] ?? a.triggerType}</Badge>
                  <span>
                    {a.definition?.actions?.length ?? 0}{' '}
                    {(a.definition?.actions?.length ?? 0) === 1 ? 'action' : 'actions'}
                  </span>
                  <span>· {a._count.runs} runs</span>
                </div>
              </div>
              <AutomationRowActions id={a.id} name={a.name} isActive={a.isActive} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
