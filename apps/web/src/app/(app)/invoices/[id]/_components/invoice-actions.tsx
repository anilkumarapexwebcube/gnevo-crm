'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { checkoutInvoice, setInvoiceStatus } from '../../actions';

export function InvoiceActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pay() {
    startTransition(async () => {
      const res = await checkoutInvoice(id);
      if (res.ok && res.url) window.location.assign(res.url);
      else toast.error(res.error ?? 'Could not start checkout');
    });
  }

  function mark(status: 'sent' | 'paid') {
    startTransition(async () => {
      const res = await setInvoiceStatus(id, status);
      if (res.ok) {
        toast.success(status === 'paid' ? 'Marked as paid' : 'Marked as sent');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed');
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== 'paid' && (
        <Button onClick={pay} loading={pending}>
          {!pending && <CreditCard />}
          Pay with Stripe
        </Button>
      )}
      {(status === 'draft' || status === 'pending') && (
        <Button variant="outline" onClick={() => mark('sent')} disabled={pending}>
          <Send />
          Mark sent
        </Button>
      )}
      {status !== 'paid' && (
        <Button variant="outline" onClick={() => mark('paid')} disabled={pending}>
          <Check />
          Mark paid
        </Button>
      )}
    </div>
  );
}
