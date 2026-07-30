'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { updateScheduledReports } from '../actions';

export function ScheduledReportsCard({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const res = await updateScheduledReports(next);
      if (res.ok) {
        toast.success(next ? 'Weekly reports enabled' : 'Weekly reports disabled');
        router.refresh();
      } else {
        setOn(!next);
        toast.error(res.error ?? 'Could not save');
      }
    });
  }

  return (
    <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Scheduled reports</h2>
            <p className="text-xs text-muted-foreground">
              Email a weekly summary to owners &amp; admins (Mondays). Needs SMTP configured.
            </p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={on}
          disabled={pending}
          onClick={toggle}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            on ? 'bg-primary' : 'bg-secondary'
          } disabled:opacity-50`}
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
              on ? 'left-[1.375rem]' : 'left-0.5'
            }`}
          />
        </button>
      </div>
    </Card>
  );
}
