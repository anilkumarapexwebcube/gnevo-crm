'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { deleteKeyword } from '../../actions';

export function KeywordRowActions({
  id,
  seoProjectId,
}: {
  id: string;
  seoProjectId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-label="Delete keyword"
      onClick={() =>
        startTransition(async () => {
          const res = await deleteKeyword(id, seoProjectId);
          if (res.ok) toast.success('Keyword removed');
          else toast.error(res.error ?? 'Failed');
        })
      }
    >
      <Trash2 />
    </Button>
  );
}
