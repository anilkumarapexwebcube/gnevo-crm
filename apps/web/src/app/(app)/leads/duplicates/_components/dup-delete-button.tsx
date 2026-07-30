'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { deleteLead } from '../../actions';

export function DupDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-danger"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await deleteLead(id);
          if (res.ok) {
            toast.success('Duplicate removed');
            router.refresh();
          } else {
            toast.error(res.error ?? 'Could not delete');
          }
        })
      }
    >
      {!pending && <Trash2 className="size-4" />}
      Delete
    </Button>
  );
}
