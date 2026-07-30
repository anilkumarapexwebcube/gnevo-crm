'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { deleteCustomer } from '../actions';

export function CustomerRowActions({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <ConfirmationDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${name}`}>
          <Trash2 />
        </Button>
      }
      icon={<Trash2 />}
      title="Delete customer?"
      description={`"${name}" will be removed.`}
      confirmText="Delete"
      variant="destructive"
      loading={pending}
      onConfirm={() =>
        startTransition(async () => {
          const res = await deleteCustomer(id);
          if (res.ok) toast.success('Customer deleted');
          else toast.error(res.error ?? 'Failed to delete customer');
        })
      }
    />
  );
}
