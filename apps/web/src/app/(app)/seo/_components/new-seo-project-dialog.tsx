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
import { createSeoProject } from '../actions';

export function NewSeoProjectDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      name: String(fd.get('name') ?? '').trim(),
      siteUrl: String(fd.get('siteUrl') ?? '').trim(),
    };
    startTransition(async () => {
      const res = await createSeoProject(input);
      if (res.ok) {
        toast.success('SEO project created');
        setOpen(false);
      } else {
        toast.error(res.error ?? 'Failed to create project');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            New SEO project
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New SEO project</DialogTitle>
          <DialogDescription>Track keywords &amp; rankings for a site.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Acme.com SEO" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="siteUrl">Site URL</Label>
            <Input id="siteUrl" name="siteUrl" type="url" required placeholder="https://acme.com" />
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
              {pending ? 'Saving…' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
