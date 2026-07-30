'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Power, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { deleteAutomation, toggleAutomation } from '../actions';

export function AutomationRowActions({
  id,
  name,
  isActive,
}: {
  id: string;
  name: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={isActive ? 'secondary' : 'outline'}
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await toggleAutomation(id, !isActive);
            if (res.ok) {
              toast.success(isActive ? 'Paused' : 'Activated');
              router.refresh();
            } else {
              toast.error(res.error ?? 'Failed');
            }
          })
        }
      >
        <Power />
        {isActive ? 'Active' : 'Paused'}
      </Button>
      <ConfirmationDialog
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${name}`}>
            <Trash2 />
          </Button>
        }
        icon={<Trash2 />}
        title="Delete automation?"
        description={`"${name}" will be removed.`}
        confirmText="Delete"
        variant="destructive"
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            const res = await deleteAutomation(id);
            if (res.ok) toast.success('Automation deleted');
            else toast.error(res.error ?? 'Failed to delete');
          })
        }
      />
    </div>
  );
}
