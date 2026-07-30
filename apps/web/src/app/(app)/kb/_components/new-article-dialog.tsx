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
import { createArticle } from '../actions';

export function NewArticleDialog() {
  const [open, setOpen] = useState(false);
  const [published, setPublished] = useState(true);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      title: String(fd.get('title') ?? '').trim(),
      body: String(fd.get('body') ?? '').trim(),
      published,
    };
    startTransition(async () => {
      const res = await createArticle(input);
      if (res.ok) {
        toast.success('Article saved');
        setOpen(false);
      } else {
        toast.error(res.error ?? 'Failed to save article');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            New article
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New article</DialogTitle>
          <DialogDescription>Add a knowledge base article.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="How to connect Google Search Console" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="body">Body</Label>
            <textarea
              id="body"
              name="body"
              required
              rows={8}
              placeholder="Write the article…"
              className="rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published
          </label>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save article'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
