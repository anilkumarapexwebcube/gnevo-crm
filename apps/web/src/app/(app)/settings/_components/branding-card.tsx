'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Palette } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { updateBranding } from '../actions';

export function BrandingCard({
  displayName,
  brandColor,
}: {
  displayName: string;
  brandColor: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [color, setColor] = useState(brandColor ?? '#6366f1');
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateBranding({ displayName: name.trim(), brandColor: color });
      if (res.ok) {
        toast.success('Branding updated');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Could not save');
      }
    });
  }

  return (
    <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
          <Palette className="size-4" />
        </div>
        <h2 className="text-sm font-semibold">Branding (white-label)</h2>
      </div>
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="brand-name">Workspace name</Label>
          <Input
            id="brand-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
          <p className="text-xs text-muted-foreground">Shown in the sidebar and browser tab.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="brand-color">Brand color</Label>
          <div className="flex items-center gap-3">
            <input
              id="brand-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="size-10 cursor-pointer rounded-lg border border-border bg-transparent p-1"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-32 font-mono"
              placeholder="#6366f1"
            />
            <span
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              Preview
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Applied as the primary accent across the app.
          </p>
        </div>
        <div>
          <Button type="submit" loading={pending}>
            {pending ? 'Saving…' : 'Save branding'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
