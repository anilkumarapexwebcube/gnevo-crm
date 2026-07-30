'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GitMerge } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { mergeLeads } from '@/lib/crm-actions';

export interface MergeLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: string;
}

const FIELDS: { key: keyof MergeLead; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'source', label: 'Source' },
  { key: 'status', label: 'Status' },
];

export function MergeDialog({ leads }: { leads: MergeLead[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [survivorId, setSurvivorId] = useState(leads[0]?.id ?? '');
  // For each field, which lead's value to keep.
  const [picks, setPicks] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, leads[0]?.id ?? ''])),
  );
  const [pending, startTransition] = useTransition();

  function valueOf(leadId: string, key: keyof MergeLead): string {
    const l = leads.find((x) => x.id === leadId);
    return (l?.[key] as string | null) ?? '';
  }

  function doMerge() {
    const data: Record<string, string | null> = {};
    for (const f of FIELDS) {
      const v = valueOf(picks[f.key] ?? survivorId, f.key);
      data[f.key] = v === '' ? null : v;
    }
    const losers = leads.filter((l) => l.id !== survivorId);
    startTransition(async () => {
      let ok = true;
      for (let i = 0; i < losers.length; i++) {
        // Apply the chosen field values on the first merge; later merges just
        // absorb remaining duplicates (notes moved, lead removed).
        const res = await mergeLeads({
          survivorId,
          losingId: losers[i]!.id,
          data: i === 0 ? data : {},
        });
        if (!res.ok) {
          ok = false;
          toast.error(res.error ?? 'Merge failed');
          break;
        }
      }
      if (ok) {
        toast.success('Leads merged');
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <GitMerge className="size-4" />
        Merge
      </Button>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Merge duplicate leads</DialogTitle>
          <DialogDescription>
            Pick the record to keep, then choose which value to keep for each field. The others are
            merged in and removed.
          </DialogDescription>
        </DialogHeader>

        {/* Survivor picker */}
        <div className="flex flex-wrap gap-2">
          {leads.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setSurvivorId(l.id);
                setPicks(Object.fromEntries(FIELDS.map((f) => [f.key, l.id])));
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                survivorId === l.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/60 hover:bg-secondary/50'
              }`}
            >
              Keep: {l.name}
            </button>
          ))}
        </div>

        {/* Field-level picks */}
        <div className="flex flex-col divide-y divide-border/40 overflow-hidden rounded-xl border border-border/50">
          {FIELDS.map((f) => (
            <div key={f.key} className="grid grid-cols-[90px_1fr] items-start gap-2 px-3 py-2.5">
              <span className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {f.label}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {leads.map((l) => {
                  const v = valueOf(l.id, f.key) || '—';
                  const selected = (picks[f.key] ?? survivorId) === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setPicks((p) => ({ ...p, [f.key]: l.id }))}
                      className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                        selected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/50 text-muted-foreground hover:bg-secondary/50'
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={doMerge} loading={pending}>
            <GitMerge className="size-4" />
            Merge {leads.length} leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
