'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Tag as TagIcon, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { setTags } from '@/lib/crm-actions';

export function TagEditor({
  entityType,
  entityId,
  initialTags,
}: {
  entityType: 'customer' | 'lead';
  entityId: string;
  initialTags: string[];
}) {
  const router = useRouter();
  const [tags, setLocalTags] = useState<string[]>(initialTags ?? []);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  function persist(next: string[]) {
    const prev = tags;
    setLocalTags(next);
    startTransition(async () => {
      const res = await setTags(entityType, entityId, next);
      if (!res.ok) {
        setLocalTags(prev);
        toast.error(res.error ?? 'Could not save tags');
      } else {
        router.refresh();
      }
    });
  }

  function add() {
    const t = input.trim().toLowerCase();
    if (!t) return;
    if (tags.includes(t)) {
      setInput('');
      return;
    }
    persist([...tags, t]);
    setInput('');
  }

  function remove(t: string) {
    persist(tags.filter((x) => x !== t));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TagIcon className="size-4 text-muted-foreground" />
      {tags.length === 0 && !adding && (
        <span className="text-sm text-muted-foreground">No tags</span>
      )}
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/20"
        >
          {t}
          <button
            onClick={() => remove(t)}
            disabled={pending}
            className="text-primary/60 hover:text-primary"
            aria-label={`Remove ${t}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {adding ? (
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            } else if (e.key === 'Escape') {
              setAdding(false);
              setInput('');
            }
          }}
          onBlur={() => {
            add();
            setAdding(false);
          }}
          placeholder="tag then Enter"
          autoFocus
          className="h-6 w-32 text-xs"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/70 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary cursor-pointer"
        >
          <Plus className="size-3" />
          Add tag
        </button>
      )}
    </div>
  );
}
