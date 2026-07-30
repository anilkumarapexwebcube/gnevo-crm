import {
  Activity as ActivityIcon,
  CheckCircle2,
  FilePlus2,
  MoveRight,
  Pencil,
} from 'lucide-react';
import { apiServer } from '@/lib/session';

interface ActivityEntry {
  id: string;
  verb: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  actorName: string | null;
  createdAt: string;
}

const VERB_ICON: Record<string, React.ElementType> = {
  created: FilePlus2,
  updated: Pencil,
  status_changed: CheckCircle2,
  stage_changed: MoveRight,
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Server component. Renders the activity timeline — global (no props) or scoped
 * to one record via entityType/entityId.
 */
export async function ActivityTimeline({
  entityType,
  entityId,
  limit = 50,
  compact = false,
}: {
  entityType?: string;
  entityId?: string;
  limit?: number;
  compact?: boolean;
}) {
  const qs = new URLSearchParams();
  if (entityType) qs.set('entityType', entityType);
  if (entityId) qs.set('entityId', entityId);
  qs.set('limit', String(limit));

  let entries: ActivityEntry[] = [];
  try {
    entries = await apiServer<ActivityEntry[]>(`/v1/activity?${qs.toString()}`);
  } catch {
    entries = [];
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <ActivityIcon className="size-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </div>
    );
  }

  return (
    <ol className="relative flex flex-col">
      {entries.map((e, i) => {
        const Icon = VERB_ICON[e.verb] ?? ActivityIcon;
        const last = i === entries.length - 1;
        return (
          <li key={e.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
                <Icon className="size-4" />
              </span>
              {!last && <span className="w-px flex-1 bg-border/60" />}
            </div>
            <div className={`flex flex-col gap-0.5 ${last ? 'pb-0' : 'pb-5'} ${compact ? '' : ''}`}>
              <p className="text-sm text-foreground">{e.summary}</p>
              <p className="text-xs text-muted-foreground">
                {e.actorName ? `${e.actorName} · ` : ''}
                {fmt(e.createdAt)}
                {!entityType && (
                  <span className="ml-2 rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                    {e.entityType}
                  </span>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
