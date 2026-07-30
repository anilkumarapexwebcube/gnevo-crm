'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTicket } from '../actions';

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function NewTicketDialog({ customers }: { customers: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState('medium');
  const [customerId, setCustomerId] = useState('none');
  const [pending, startTransition] = useTransition();

  const customerItems = [
    { value: 'none', label: 'No customer' },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
  ];

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      subject: String(fd.get('subject') ?? '').trim(),
      description: String(fd.get('description') ?? '').trim(),
      priority,
      customerId: customerId === 'none' ? undefined : customerId,
    };
    startTransition(async () => {
      const res = await createTicket(input);
      if (res.ok) {
        toast.success('Ticket created');
        setOpen(false);
      } else {
        toast.error(res.error ?? 'Failed to create ticket');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            New ticket
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New ticket</DialogTitle>
          <DialogDescription>Log a support request.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" required placeholder="Login issue" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              required
              rows={4}
              placeholder="Describe the issue…"
              className="rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select items={PRIORITIES} value={priority} onValueChange={(v) => setPriority(v ?? 'medium')}>
                <SelectTrigger id="priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer">Customer</Label>
              <Select
                items={customerItems}
                value={customerId}
                onValueChange={(v) => setCustomerId(v ?? 'none')}
              >
                <SelectTrigger id="customer" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customerItems.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Create ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
