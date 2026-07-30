import { Activity as ActivityIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ActivityTimeline } from '@/components/activity-timeline';

export const metadata = {
  title: 'Activity | Gnevo CRM',
  description: 'Recent activity across your workspace.',
};

export default function ActivityPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
          <ActivityIcon className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground">Everything happening across your workspace</p>
        </div>
      </div>

      <Card className="p-6 rounded-2xl border-0 ring-1 ring-border/50 shadow-sm">
        <ActivityTimeline limit={80} />
      </Card>
    </div>
  );
}
