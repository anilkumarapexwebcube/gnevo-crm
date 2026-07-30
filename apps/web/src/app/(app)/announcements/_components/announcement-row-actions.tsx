'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { deleteAnnouncement } from '../actions';

export function AnnouncementRowActions({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <ConfirmationDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${title}`}>
          <Trash2 />
        </Button>
      }
      icon={<Trash2 />}
      title="Delete announcement?"
      description={`"${title}" will be removed.`}
      confirmText="Delete"
      variant="destructive"
      loading={pending}
      onConfirm={() =>
        startTransition(async () => {
          const res = await deleteAnnouncement(id);
          if (res.ok) toast.success('Announcement deleted');
          else toast.error(res.error ?? 'Failed to delete');
        })
      }
    />
  );
}
