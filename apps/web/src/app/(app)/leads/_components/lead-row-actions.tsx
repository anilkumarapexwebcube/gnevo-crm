'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { deleteLead } from '../actions';

export function LeadRowActions({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <ConfirmationDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${name}`}>
          <Trash2 />
        </Button>
      }
      icon={<Trash2 />}
      title="Delete lead?"
      description={`"${name}" will be removed from your pipeline.`}
      confirmText="Delete"
      variant="destructive"
      loading={pending}
      onConfirm={() =>
        startTransition(async () => {
          const res = await deleteLead(id);
          if (res.ok) toast.success('Lead deleted');
          else toast.error(res.error ?? 'Failed to delete lead');
        })
      }
    />
  );
}
