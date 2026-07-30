'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { deleteArticle } from '../actions';

export function ArticleRowActions({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <ConfirmationDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${title}`}>
          <Trash2 />
        </Button>
      }
      icon={<Trash2 />}
      title="Delete article?"
      description={`"${title}" will be removed.`}
      confirmText="Delete"
      variant="destructive"
      loading={pending}
      onConfirm={() =>
        startTransition(async () => {
          const res = await deleteArticle(id);
          if (res.ok) toast.success('Article deleted');
          else toast.error(res.error ?? 'Failed to delete');
        })
      }
    />
  );
}
