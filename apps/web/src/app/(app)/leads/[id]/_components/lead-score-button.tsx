'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { scoreLead } from '../../actions';

export function LeadScoreButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-full shadow-sm hover:shadow-md hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await scoreLead(id);
          if (res.ok) {
            toast.success(`AI score: ${res.score}`);
            router.refresh();
          } else {
            toast.error(res.error ?? 'Scoring failed');
          }
        })
      }
    >
      <Sparkles className="mr-1 size-3.5" />
      {pending ? 'Scoring…' : 'Score with AI'}
    </Button>
  );
}
