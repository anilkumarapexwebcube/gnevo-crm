'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { deleteProject } from '../actions';

export function ProjectRowActions({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <ConfirmationDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${name}`}>
          <Trash2 />
        </Button>
      }
      icon={<Trash2 />}
      title="Delete project?"
      description={`"${name}" and its tasks will be removed.`}
      confirmText="Delete"
      variant="destructive"
      loading={pending}
      onConfirm={() =>
        startTransition(async () => {
          const res = await deleteProject(id);
          if (res.ok) toast.success('Project deleted');
          else toast.error(res.error ?? 'Failed to delete project');
        })
      }
    />
  );
}
