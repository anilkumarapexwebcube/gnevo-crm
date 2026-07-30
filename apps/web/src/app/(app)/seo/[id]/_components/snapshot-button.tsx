'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { snapshotKeywords } from '../../actions';

export function SnapshotButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await snapshotKeywords(projectId);
          if (res.ok) {
            toast.success(`Captured ${res.captured ?? 0} keyword snapshot(s)`);
            router.refresh();
          } else {
            toast.error(res.error ?? 'Could not snapshot');
          }
        })
      }
    >
      {!pending && <CalendarClock className="size-4" />}
      Snapshot
    </Button>
  );
}
