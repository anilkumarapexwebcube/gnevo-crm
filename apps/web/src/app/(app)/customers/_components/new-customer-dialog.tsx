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
import { createCustomer } from '../actions';

export function NewCustomerDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('company');
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      name: String(fd.get('name') ?? '').trim(),
      type,
      industry: fd.get('industry') ? String(fd.get('industry')) : undefined,
      website: fd.get('website') ? String(fd.get('website')) : undefined,
    };
    startTransition(async () => {
      const res = await createCustomer(input);
      if (res.ok) {
        toast.success('Customer created');
        setOpen(false);
      } else {
        toast.error(res.error ?? 'Failed to create customer');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="rounded-full shadow-sm hover:shadow-md transition-all bg-primary hover:bg-primary/90">
            <Plus className="mr-1 size-4" />
            New customer
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
          <DialogDescription>Add a customer account.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Acme Inc." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select
                items={[
                  { value: 'company', label: 'Company' },
                  { value: 'individual', label: 'Individual' },
                ]}
                value={type}
                onValueChange={(v) => setType(v ?? 'company')}
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" placeholder="SaaS" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" placeholder="acme.com" />
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
              {pending ? 'Saving…' : 'Create customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
