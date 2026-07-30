'use client';

import { useMemo, useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createInvoice } from '../actions';

interface CustomerOption {
  id: string;
  name: string;
}
interface Line {
  description: string;
  quantity: string;
  unitPrice: string;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'];

const emptyLine = (): Line => ({ description: '', quantity: '1', unitPrice: '0' });

export function NewInvoiceDialog({ customers }: { customers: CustomerOption[] }) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('none');
  const [currency, setCurrency] = useState('USD');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [pending, startTransition] = useTransition();

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function reset() {
    setLines([emptyLine()]);
    setCustomerId('none');
    setCurrency('USD');
    setDueDate('');
    setNotes('');
  }

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0),
    [lines],
  );
  const money = (v: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(v);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = {
      customerId: customerId === 'none' ? undefined : customerId,
      currency,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
      lines: lines.map((l) => ({
        description: l.description.trim(),
        quantity: Number(l.quantity) || 1,
        unitPrice: Number(l.unitPrice) || 0,
      })),
    };
    startTransition(async () => {
      const res = await createInvoice(input);
      if (res.ok) {
        toast.success('Invoice created');
        setOpen(false);
        reset();
      } else {
        toast.error(res.error ?? 'Failed to create invoice');
      }
    });
  }

  const customerItems = [
    { value: 'none', label: 'No customer' },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
  ];
  const currencyItems = CURRENCIES.map((c) => ({ value: c, label: c }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            New invoice
          </Button>
        }
      />
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
          <DialogDescription>
            Add customer, due date and line items. New invoices start as{' '}
            <span className="font-medium text-warning">Pending</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="grid gap-2">
              <Label htmlFor="due">Due date</Label>
              <Input
                id="due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:max-w-[8rem]">
            <Label htmlFor="currency">Currency</Label>
            <Select items={currencyItems} value={currency} onValueChange={(v) => setCurrency(v ?? 'USD')}>
              <SelectTrigger id="currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyItems.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Line items</Label>
            {/* Column headers */}
            <div className="flex items-center gap-2 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="flex-1">Description</span>
              <span className="w-16 text-center">Qty</span>
              <span className="w-24 text-right">Unit price</span>
              <span className="w-24 text-right">Amount</span>
              <span className="w-7" />
            </div>
            <div className="flex flex-col gap-2">
              {lines.map((line, i) => {
                const amount = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(i, { description: e.target.value })}
                      placeholder="e.g. Guest posting"
                      required
                      className="h-9 flex-1"
                    />
                    <Input
                      value={line.quantity}
                      onChange={(e) => updateLine(i, { quantity: e.target.value })}
                      type="number"
                      min="1"
                      className="h-9 w-16 text-center"
                      aria-label="Quantity"
                    />
                    <Input
                      value={line.unitPrice}
                      onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-9 w-24 text-right"
                      aria-label="Unit price"
                    />
                    <span className="w-24 text-right text-sm font-medium tabular-nums">
                      {money(amount)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="w-7 text-muted-foreground hover:text-danger"
                      disabled={lines.length === 1}
                      onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="Remove line"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
            >
              <Plus />
              Add line
            </Button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, thank-you note, etc."
              rows={2}
            />
          </div>

          {/* Total */}
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-lg font-bold tabular-nums">{money(total)}</span>
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" loading={pending}>
              {pending ? 'Creating…' : 'Create invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
