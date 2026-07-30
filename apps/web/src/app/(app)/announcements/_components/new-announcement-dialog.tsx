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
import { createAnnouncement } from '../actions';

export function NewAnnouncementDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      title: String(fd.get('title') ?? '').trim(),
      body: String(fd.get('body') ?? '').trim(),
    };
    startTransition(async () => {
      const res = await createAnnouncement(input);
      if (res.ok) {
        toast.success('Announcement posted');
        setOpen(false);
      } else {
        toast.error(res.error ?? 'Failed to post');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            New announcement
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
          <DialogDescription>Post to everyone in the workspace.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="Holiday schedule" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="body">Message</Label>
            <textarea
              id="body"
              name="body"
              required
              rows={5}
              placeholder="Write your announcement…"
              className="rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
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
              {pending ? 'Posting…' : 'Post announcement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
