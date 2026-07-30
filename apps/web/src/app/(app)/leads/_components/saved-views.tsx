'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, BookmarkPlus, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getLeadViews, saveLeadView, deleteLeadView, type SavedView } from '../actions';

interface Props {
  current: { status?: string; source?: string; q?: string };
  initialViews: SavedView[];
}

function toQuery(c: Props['current']): Record<string, string> {
  const q: Record<string, string> = {};
  if (c.status && c.status !== 'all') q.status = c.status;
  if (c.source && c.source !== 'all') q.source = c.source;
  if (c.q) q.q = c.q;
  return q;
}

export function SavedViews({ current, initialViews }: Props) {
  const router = useRouter();
  const [views, setViews] = useState<SavedView[]>(initialViews);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [pending, startTransition] = useTransition();

  function apply(v: SavedView) {
    const params = new URLSearchParams(v.query).toString();
    router.push(`/leads${params ? `?${params}` : ''}`);
  }

  function save() {
    const q = toQuery(current);
    startTransition(async () => {
      const res = await saveLeadView(name.trim(), q);
      if (res.ok) {
        toast.success('View saved');
        setOpen(false);
        setName('');
        setViews(await getLeadViews());
      } else {
        toast.error(res.error ?? 'Could not save');
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteLeadView(id);
      if (res.ok) {
        setViews((prev) => prev.filter((v) => v.id !== id));
        toast.success('View removed');
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              <Bookmark className="size-4" />
              Views
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Saved views</div>
          {views.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">No saved views yet.</div>
          ) : (
            views.map((v) => (
              <DropdownMenuItem
                key={v.id}
                onClick={() => apply(v)}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2 truncate">
                  <Check className="size-3.5 text-muted-foreground" />
                  {v.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(v.id);
                  }}
                  className="text-muted-foreground hover:text-danger"
                  aria-label={`Delete ${v.name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <BookmarkPlus className="size-4" />
            Save current filters…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save current view</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) save();
            }}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="view-name">View name</Label>
              <Input
                id="view-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. New website leads"
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" loading={pending} disabled={!name.trim()}>
                Save view
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
