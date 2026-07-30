'use client';

import { useState, useTransition } from 'react';
import { UserPlus } from 'lucide-react';
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
import { addContact } from '../actions';

export function AddContactDialog({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      name: String(fd.get('name') ?? '').trim(),
      email: fd.get('email') ? String(fd.get('email')) : undefined,
      phone: fd.get('phone') ? String(fd.get('phone')) : undefined,
      title: fd.get('title') ? String(fd.get('title')) : undefined,
    };
    startTransition(async () => {
      const res = await addContact(customerId, input);
      if (res.ok) {
        toast.success('Contact added');
        setOpen(false);
      } else {
        toast.error(res.error ?? 'Failed to add contact');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="rounded-full hover:shadow-sm hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all">
            <UserPlus className="mr-1 size-3.5" />
            Add contact
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
          <DialogDescription>Add a contact to this customer.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Jane Doe" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="jane@acme.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" placeholder="+91…" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="Marketing Lead" />
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
              {pending ? 'Saving…' : 'Add contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
