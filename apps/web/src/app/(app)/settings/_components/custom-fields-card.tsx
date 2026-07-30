'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ListPlus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateCustomFields, type CustomFieldDef } from '../actions';

const TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL' },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export function CustomFieldsCard({ initial }: { initial: CustomFieldDef[] }) {
  const router = useRouter();
  const [fields, setFields] = useState<CustomFieldDef[]>(initial);
  const [pending, startTransition] = useTransition();

  function add() {
    setFields((prev) => [...prev, { key: '', label: '', type: 'text' }]);
  }
  function update(i: number, patch: Partial<CustomFieldDef>) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function persist(list: CustomFieldDef[], successMsg: string) {
    const cleaned = list
      .map((f) => ({ ...f, key: f.key || slug(f.label), label: f.label.trim() }))
      .filter((f) => f.key && f.label);
    if (cleaned.some((f) => !/^[a-z0-9_]+$/.test(f.key))) {
      toast.error('Keys may only use lowercase letters, numbers and underscores');
      return;
    }
    startTransition(async () => {
      const res = await updateCustomFields('customer', cleaned);
      if (res.ok) {
        toast.success(successMsg);
        router.refresh();
      } else {
        toast.error(res.error ?? 'Could not save');
      }
    });
  }

  // Deleting persists immediately (users expect the trash icon to stick).
  function remove(i: number) {
    const next = fields.filter((_, idx) => idx !== i);
    setFields(next);
    persist(next, 'Field removed');
  }

  function save() {
    persist(fields, 'Custom fields saved');
  }

  return (
    <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
          <ListPlus className="size-4" />
        </div>
        <h2 className="text-sm font-semibold">Custom fields — Customers</h2>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="flex-1">Label</span>
          <span className="w-40">Key</span>
          <span className="w-28">Type</span>
          <span className="w-8" />
        </div>
        {fields.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            No custom fields yet. Add one to capture extra data on every customer.
          </p>
        )}
        {fields.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={f.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="e.g. Account tier"
              className="h-9 flex-1"
            />
            <Input
              value={f.key}
              onChange={(e) => update(i, { key: slug(e.target.value) })}
              onBlur={() => !f.key && f.label && update(i, { key: slug(f.label) })}
              placeholder="account_tier"
              className="h-9 w-40 font-mono text-xs"
            />
            <div className="w-28">
              <Select items={TYPES} value={f.type} onValueChange={(v) => update(i, { type: (v ?? 'text') as CustomFieldDef['type'] })}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="w-8 text-muted-foreground hover:text-danger"
              onClick={() => remove(i)}
              aria-label="Remove field"
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" />
          Add field
        </Button>
        <Button type="button" size="sm" onClick={save} loading={pending}>
          Save fields
        </Button>
      </div>
    </Card>
  );
}
