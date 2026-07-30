'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateCustomer } from '../actions';

interface CustomFieldDef {
  key: string;
  label: string;
  type: string;
}

interface Props {
  customer: {
    id: string;
    name: string;
    type: string;
    status: string;
    industry: string | null;
    website: string | null;
    custom?: Record<string, string> | null;
  };
  customFields?: CustomFieldDef[];
}

const TYPES = [
  { value: 'company', label: 'Company' },
  { value: 'individual', label: 'Individual' },
];
const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'churned', label: 'Churned' },
  { value: 'archived', label: 'Archived' },
];

export function EditCustomerDialog({ customer, customFields = [] }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(customer.name);
  const [type, setType] = useState(customer.type);
  const [status, setStatus] = useState(customer.status);
  const [industry, setIndustry] = useState(customer.industry ?? '');
  const [website, setWebsite] = useState(customer.website ?? '');
  const [custom, setCustom] = useState<Record<string, string>>(customer.custom ?? {});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateCustomer(customer.id, {
        name: name.trim(),
        type,
        status,
        industry: industry.trim(),
        website: website.trim(),
        ...(customFields.length ? { custom } : {}),
      });
      if (res.ok) {
        toast.success('Customer updated');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? 'Could not update');
      }
    });
  }

  const sel = (
    value: string,
    set: (v: string) => void,
    items: { value: string; label: string }[],
    id: string,
  ) => (
    <Select items={items} value={value} onValueChange={(v) => set(v ?? items[0]!.value)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
        Edit
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="c-type">Type</Label>
              {sel(type, setType, TYPES, 'c-type')}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-status">Status</Label>
              {sel(status, setStatus, STATUSES, 'c-status')}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="c-industry">Industry</Label>
            <Input
              id="c-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. SaaS"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="c-website">Website</Label>
            <Input
              id="c-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="example.com"
            />
          </div>

          {customFields.length > 0 && (
            <div className="grid gap-3 border-t border-border/40 pt-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Custom fields
              </span>
              {customFields.map((f) => (
                <div key={f.key} className="grid gap-2">
                  <Label htmlFor={`cf-${f.key}`}>{f.label}</Label>
                  <Input
                    id={`cf-${f.key}`}
                    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                    value={custom[f.key] ?? ''}
                    onChange={(e) => setCustom((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" loading={pending}>
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
