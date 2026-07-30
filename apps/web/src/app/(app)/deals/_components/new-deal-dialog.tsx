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
import { createDeal } from '../actions';

interface StageOption {
  id: string;
  name: string;
}

export function NewDealDialog({ stages }: { stages: StageOption[] }) {
  const [open, setOpen] = useState(false);
  const [stageId, setStageId] = useState(stages[0]?.id ?? '');
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      title: String(fd.get('title') ?? '').trim(),
      value: Number(fd.get('value') ?? 0),
      currency: 'USD',
      stageId,
    };
    startTransition(async () => {
      const res = await createDeal(input);
      if (res.ok) {
        toast.success('Deal created');
        setOpen(false);
      } else {
        toast.error(res.error ?? 'Failed to create deal');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={stages.length === 0}>
            <Plus />
            New deal
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New deal</DialogTitle>
          <DialogDescription>Add a deal to the pipeline.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="Acme retainer" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="value">Value (USD)</Label>
              <Input id="value" name="value" type="number" min="0" step="100" defaultValue="0" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stage">Stage</Label>
              <Select
                items={stages.map((s) => ({ value: s.id, label: s.name }))}
                value={stageId}
                onValueChange={(v) => setStageId(v ?? '')}
              >
                <SelectTrigger id="stage" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
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
              {pending ? 'Saving…' : 'Create deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
