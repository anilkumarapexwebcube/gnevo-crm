'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { deleteSeoProject } from '../actions';

export function SeoProjectRowActions({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <ConfirmationDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${name}`}>
          <Trash2 />
        </Button>
      }
      icon={<Trash2 />}
      title="Delete SEO project?"
      description={`"${name}" and its keywords will be removed.`}
      confirmText="Delete"
      variant="destructive"
      loading={pending}
      onConfirm={() =>
        startTransition(async () => {
          const res = await deleteSeoProject(id);
          if (res.ok) toast.success('Project deleted');
          else toast.error(res.error ?? 'Failed to delete');
        })
      }
    />
  );
}
