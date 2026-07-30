'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { convertLead } from '../../actions';

export function ConvertLeadButton({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (status === 'converted') {
    return (
      <Button variant="outline" size="sm" disabled>
        Converted
      </Button>
    );
  }

  function convert() {
    startTransition(async () => {
      const res = await convertLead(id);
      if (res.ok && res.customerId) {
        toast.success('Lead converted to customer');
        router.push(`/customers/${res.customerId}`);
        router.refresh();
      } else {
        toast.error(res.error ?? 'Could not convert');
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={convert} loading={pending}>
      {!pending && <UserPlus className="size-4" />}
      Convert to customer
    </Button>
  );
}
