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
import { addKeyword } from '../../actions';

export function AddKeywordDialog({ seoProjectId }: { seoProjectId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      seoProjectId,
      term: String(fd.get('term') ?? '').trim(),
      position: fd.get('position') ? Number(fd.get('position')) : undefined,
    };
    startTransition(async () => {
      const res = await addKeyword(input);
      if (res.ok) {
        toast.success('Keyword added');
        setOpen(false);
      } else {
        toast.error(res.error ?? 'Failed to add keyword');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus />
            Add keyword
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add keyword</DialogTitle>
          <DialogDescription>Track a keyword&apos;s rank for this site.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="term">Keyword</Label>
            <Input id="term" name="term" required placeholder="seo agency" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="position">Current position (optional)</Label>
            <Input id="position" name="position" type="number" min="1" max="200" placeholder="e.g. 4" />
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
              {pending ? 'Saving…' : 'Add keyword'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
