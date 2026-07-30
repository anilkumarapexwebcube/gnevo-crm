'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { MessageSquare, Phone, Mail, Users, StickyNote, Trash2, Send, AtSign } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listNotes,
  addNote,
  deleteNote,
  getMembers,
  type NoteItem,
  type Member,
} from '@/lib/crm-actions';

const KINDS = [
  { value: 'note', label: 'Note', icon: StickyNote },
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Users },
];
const ICON: Record<string, React.ElementType> = {
  note: StickyNote,
  call: Phone,
  email: Mail,
  meeting: Users,
};

export function NotesTimeline({
  entityType,
  entityId,
}: {
  entityType: 'customer' | 'lead' | 'deal';
  entityId: string;
}) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState('note');
  const [body, setBody] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // @mention autocomplete
  const [members, setMembers] = useState<Member[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotes(await listNotes(entityType, entityId));
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getMembers().then(setMembers);
  }, []);

  function onBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setBody(val);
    const pos = e.target.selectionStart ?? val.length;
    const m = val.slice(0, pos).match(/@(\w*)$/);
    setMentionQuery(m ? (m[1] ?? '').toLowerCase() : null);
  }

  const suggestions =
    mentionQuery !== null
      ? members
          .filter((mm) => {
            const first = (mm.fullName.split(' ')[0] ?? '').toLowerCase();
            const local = (mm.email.split('@')[0] ?? '').toLowerCase();
            return (
              mentionQuery === '' ||
              first.startsWith(mentionQuery) ||
              local.startsWith(mentionQuery) ||
              mm.fullName.toLowerCase().includes(mentionQuery)
            );
          })
          .slice(0, 6)
      : [];

  function insertMention(mm: Member) {
    const ta = taRef.current;
    const pos = ta?.selectionStart ?? body.length;
    const token = (mm.fullName.split(' ')[0] ?? mm.email.split('@')[0] ?? 'user').toLowerCase();
    const before = body.slice(0, pos).replace(/@(\w*)$/, `@${token} `);
    const next = before + body.slice(pos);
    setBody(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(before.length, before.length);
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await addNote({ entityType, entityId, kind, body: body.trim() });
      if (res.ok) {
        setBody('');
        toast.success('Logged');
        await load();
      } else {
        toast.error(res.error ?? 'Could not save');
      }
    });
  }

  function remove(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const res = await deleteNote(id);
      if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
      setBusyId(null);
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquare className="size-4 text-muted-foreground" />
        Notes &amp; activity log
      </h2>

      {/* Composer */}
      <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-border/50 p-3">
        <div className="flex items-center gap-2">
          <Select items={KINDS} value={kind} onValueChange={(v) => setKind(v ?? 'note')}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            Tip: mention a teammate with <span className="font-mono">@name</span>
          </span>
        </div>
        <div className="relative">
          <Textarea
            ref={taRef}
            value={body}
            onChange={onBodyChange}
            onBlur={() => setTimeout(() => setMentionQuery(null), 150)}
            placeholder="Log a call, email, meeting or note…"
            rows={2}
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-50 mt-1 w-64 overflow-hidden rounded-xl border border-border/50 bg-popover shadow-xl">
              {suggestions.map((mm) => (
                <li key={mm.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(mm);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10"
                  >
                    <AtSign className="size-3.5 text-muted-foreground" />
                    <span className="flex flex-col">
                      <span className="font-medium">{mm.fullName}</span>
                      <span className="text-xs text-muted-foreground">{mm.email}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={pending} disabled={!body.trim()}>
            {!pending && <Send className="size-4" />}
            Log {KINDS.find((k) => k.value === kind)?.label.toLowerCase()}
          </Button>
        </div>
      </form>

      {loading ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No notes yet. Log your first interaction above.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {notes.map((n) => {
            const Icon = ICON[n.kind] ?? StickyNote;
            return (
              <li key={n.id} className="group flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col rounded-xl bg-secondary/30 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {n.authorName ?? 'Someone'}
                      <span className="ml-1.5 font-normal capitalize text-muted-foreground">
                        · {n.kind}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">{fmt(n.createdAt)}</span>
                      <button
                        onClick={() => remove(n.id)}
                        disabled={busyId === n.id}
                        className="group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg"
                        aria-label="Delete note"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{n.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
