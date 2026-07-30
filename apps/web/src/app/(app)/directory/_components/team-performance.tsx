import { Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { MemberPerformance } from '@/lib/team-actions';

const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';

export function TeamPerformance({ rows }: { rows: MemberPerformance[] }) {
  const active = rows.filter((r) => r.total > 0);
  return (
    <Card className="rounded-2xl p-5 shadow-sm ring-1 ring-border/50">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Trophy className="size-4 text-amber-500" />
        Team performance
      </h2>
      {active.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No tasks assigned yet.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {active.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3">
              <span className="w-4 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-primary to-primary/70 text-[10px] font-bold text-primary-foreground">
                {initials(r.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-foreground">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.done}/{r.total} done{r.overdue > 0 ? ` · ${r.overdue} overdue` : ''}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-linear-to-r from-primary to-purple-500" style={{ width: `${r.completion}%` }} />
                </div>
              </div>
              <span className="w-10 text-right text-xs font-semibold text-foreground">{r.completion}%</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
