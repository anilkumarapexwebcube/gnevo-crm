'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { deleteTicket } from '../actions';

export function TicketRowActions({ id, subject }: { id: string; subject: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <ConfirmationDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${subject}`}>
          <Trash2 />
        </Button>
      }
      icon={<Trash2 />}
      title="Delete ticket?"
      description={`"${subject}" will be removed.`}
      confirmText="Delete"
      variant="destructive"
      loading={pending}
      onConfirm={() =>
        startTransition(async () => {
          const res = await deleteTicket(id);
          if (res.ok) toast.success('Ticket deleted');
          else toast.error(res.error ?? 'Failed to delete');
        })
      }
    />
  );
}
