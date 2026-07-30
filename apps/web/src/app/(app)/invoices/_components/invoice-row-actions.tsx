'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { deleteInvoice } from '../actions';

export function InvoiceRowActions({ id, number }: { id: string; number: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <ConfirmationDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${number}`}>
          <Trash2 />
        </Button>
      }
      icon={<Trash2 />}
      title="Delete invoice?"
      description={`"${number}" will be removed.`}
      confirmText="Delete"
      variant="destructive"
      loading={pending}
      onConfirm={() =>
        startTransition(async () => {
          const res = await deleteInvoice(id);
          if (res.ok) toast.success('Invoice deleted');
          else toast.error(res.error ?? 'Failed to delete invoice');
        })
      }
    />
  );
}
