'use client';

import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'churned', label: 'Churned' },
  { value: 'archived', label: 'Archived' },
];

const TYPES = [
  { value: 'all', label: 'All types' },
  { value: 'company', label: 'Company' },
  { value: 'individual', label: 'Individual' },
];

interface Props {
  status: string;
  type: string;
  q: string;
}

export function CustomersFilterBar({ status, type, q }: Props) {
  const router = useRouter();

  function apply(next: Partial<Props>) {
    const params = new URLSearchParams();
    const merged = { status, type, q, ...next };
    if (merged.status && merged.status !== 'all') params.set('status', merged.status);
    if (merged.type && merged.type !== 'all') params.set('type', merged.type);
    if (merged.q) params.set('q', merged.q);
    const qs = params.toString();
    router.replace(qs ? `/customers?${qs}` : '/customers');
  }

  const hasFilters = (status && status !== 'all') || (type && type !== 'all') || !!q;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get('q');
          apply({ q: value ? String(value) : '' });
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search customers…"
          className="h-8 w-56 pl-8 rounded-full bg-secondary/20 hover:bg-secondary/40 transition-colors border-border/50 hover:border-border/80 focus-visible:ring-primary/20"
        />
      </form>

      <Select
        items={STATUSES}
        value={status || 'all'}
        onValueChange={(v) => apply({ status: v ?? 'all' })}
      >
        <SelectTrigger size="sm" className="w-36 rounded-full bg-secondary/20 hover:bg-secondary/40 transition-colors border-border/50 hover:border-border/80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={TYPES}
        value={type || 'all'}
        onValueChange={(v) => apply({ type: v ?? 'all' })}
      >
        <SelectTrigger size="sm" className="w-36 rounded-full bg-secondary/20 hover:bg-secondary/40 transition-colors border-border/50 hover:border-border/80">
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

      {hasFilters && (
        <Button variant="ghost" size="sm" className="rounded-full hover:bg-secondary/40" onClick={() => router.replace('/customers')}>
          <X className="size-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
