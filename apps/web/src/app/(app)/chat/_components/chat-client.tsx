'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash,
  Lock,
  Send,
  Plus,
  Users,
  Search,
  Check,
  MessageSquare,
  Loader2,
  MessagesSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Member } from '@/lib/crm-actions';
import {
  createChannel,
  getThread,
  listChannels,
  markChannelRead,
  openDm,
  sendMessage,
  type ChatChannel,
  type ChatMessage,
} from '@/lib/chat-actions';

const POLL_MS = 4000;

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ChatClient({
  meId,
  meName,
  initialChannels,
  members,
}: {
  meId: string;
  meName: string;
  initialChannels: ChatChannel[];
  members: Member[];
}) {
  const [channels, setChannels] = useState<ChatChannel[]>(initialChannels);
  const [activeId, setActiveId] = useState<string | null>(initialChannels[0]?.id ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMsgId = useRef<string | null>(null);

  const active = channels.find((c) => c.id === activeId) ?? null;

  const refreshChannels = useCallback(async () => {
    const next = await listChannels();
    setChannels(next);
  }, []);

  const loadThread = useCallback(
    async (id: string, showSpinner = false) => {
      if (showSpinner) setLoadingThread(true);
      const t = await getThread(id);
      if (t) {
        setMessages(t.messages);
        const newest = t.messages.at(-1)?.id ?? null;
        if (newest !== lastMsgId.current) {
          lastMsgId.current = newest;
          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          });
        }
      }
      if (showSpinner) setLoadingThread(false);
    },
    [],
  );

  // Load thread + mark read when switching channels.
  useEffect(() => {
    if (!activeId) return;
    lastMsgId.current = null;
    void loadThread(activeId, true);
    void markChannelRead(activeId).then(refreshChannels);
  }, [activeId, loadThread, refreshChannels]);

  // Poll for new messages + unread counts.
  useEffect(() => {
    const t = setInterval(() => {
      if (activeId) void loadThread(activeId);
      void refreshChannels();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [activeId, loadThread, refreshChannels]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    // Optimistic append.
    const optimistic: ChatMessage = {
      id: `tmp-${body.length}-${messages.length}`,
      channelId: activeId,
      authorId: meId,
      authorName: meName,
      body,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setDraft('');
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }),
    );
    const res = await sendMessage(activeId, body);
    setSending(false);
    if (!res.ok) {
      toast.error(res.error ?? 'Failed to send');
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } else {
      void loadThread(activeId);
      void refreshChannels();
    }
  }

  const rooms = channels.filter((c) => !c.isDm);
  const dms = channels.filter((c) => c.isDm);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col rounded-2xl border border-border/50 bg-card/50 backdrop-blur">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <MessagesSquare className="size-4 text-primary" />
            Team Chat
          </h2>
          <NewChannelDialog members={members} onCreated={(id) => { void refreshChannels(); setActiveId(id); }} />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <SectionLabel icon={Hash} label="Channels" />
          <AnimatePresence initial={false}>
            {rooms.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">No channels yet.</p>
            )}
            {rooms.map((c) => (
              <ChannelRow key={c.id} c={c} active={c.id === activeId} onClick={() => setActiveId(c.id)} />
            ))}
          </AnimatePresence>

          <div className="mt-3 flex items-center justify-between pr-1">
            <SectionLabel icon={Users} label="Direct Messages" />
            <NewDmDialog members={members} onOpened={(id) => { void refreshChannels(); setActiveId(id); }} />
          </div>
          <AnimatePresence initial={false}>
            {dms.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">No direct messages.</p>
            )}
            {dms.map((c) => (
              <ChannelRow key={c.id} c={c} active={c.id === activeId} onClick={() => setActiveId(c.id)} dm />
            ))}
          </AnimatePresence>
        </div>
      </aside>

      {/* Thread */}
      <section className="flex flex-1 flex-col rounded-2xl border border-border/50 bg-card/50 backdrop-blur">
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MessageSquare className="size-7" />
            </div>
            <p className="text-sm font-medium text-foreground">Select a channel to start chatting</p>
            <p className="text-xs text-muted-foreground">Create a channel or start a direct message.</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-2 border-b border-border/40 px-5 py-3.5">
              {active.isDm ? (
                <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                  {initials(active.name)}
                </span>
              ) : active.isPrivate ? (
                <Lock className="size-4 text-muted-foreground" />
              ) : (
                <Hash className="size-4 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{active.name}</p>
                {active.description && (
                  <p className="truncate text-xs text-muted-foreground">{active.description}</p>
                )}
              </div>
              {!active.isDm && (
                <span className="ml-auto flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                  <Users className="size-3" />
                  {active.memberCount}
                </span>
              )}
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {loadingThread ? (
                <div className="flex justify-center pt-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center gap-2 pt-10 text-center">
                  <MessageSquare className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No messages yet — say hello 👋</p>
                </div>
              ) : (
                messages.map((m, i) => {
                  const mine = m.authorId === meId;
                  const prev = messages[i - 1];
                  const grouped = prev && prev.authorId === m.authorId;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn('flex gap-2.5', mine && 'flex-row-reverse')}
                    >
                      <div className="w-8 shrink-0">
                        {!grouped && (
                          <span
                            className={cn(
                              'grid size-8 place-items-center rounded-full text-[11px] font-bold shadow-sm',
                              mine ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
                            )}
                          >
                            {initials(m.authorName)}
                          </span>
                        )}
                      </div>
                      <div className={cn('flex max-w-[72%] flex-col gap-0.5', mine && 'items-end')}>
                        {!grouped && (
                          <div className={cn('flex items-center gap-2 px-1', mine && 'flex-row-reverse')}>
                            <span className="text-xs font-semibold text-foreground">
                              {mine ? 'You' : m.authorName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{timeLabel(m.createdAt)}</span>
                          </div>
                        )}
                        <div
                          className={cn(
                            'whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-[14px] leading-relaxed shadow-sm',
                            mine
                              ? 'rounded-br-md bg-primary text-primary-foreground'
                              : 'rounded-bl-md border border-border/50 bg-card text-foreground',
                          )}
                        >
                          {m.body}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border/40 p-3">
              <div className="flex items-end gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={`Message ${active.isDm ? active.name : '#' + active.name}…`}
                  rows={1}
                  className="max-h-32 min-h-10 resize-none rounded-xl"
                />
                <Button onClick={handleSend} disabled={sending || !draft.trim()} size="icon" className="size-10 shrink-0 rounded-xl">
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
              <p className="mt-1 px-1 text-[10px] text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: typeof Hash; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      <Icon className="size-3" />
      {label}
    </div>
  );
}

function ChannelRow({
  c,
  active,
  onClick,
  dm,
}: {
  c: ChatChannel;
  active: boolean;
  onClick: () => void;
  dm?: boolean;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
        active ? 'bg-primary/10 text-primary' : 'text-foreground/80 hover:bg-secondary/50',
      )}
    >
      {dm ? (
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
          {initials(c.name)}
        </span>
      ) : c.isPrivate ? (
        <Lock className="size-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <Hash className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className={cn('flex-1 truncate', c.unread > 0 && 'font-bold text-foreground')}>{c.name}</span>
      {c.unread > 0 && (
        <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
          {c.unread}
        </span>
      )}
    </motion.button>
  );
}

function NewChannelDialog({
  members,
  onCreated,
}: {
  members: Member[];
  onCreated: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await createChannel({
      name: name.trim(),
      description: description.trim() || undefined,
      isPrivate,
      memberIds: Array.from(selected),
    });
    setSaving(false);
    if (res.ok && res.id) {
      toast.success('Channel created');
      setOpen(false);
      setName('');
      setDescription('');
      setIsPrivate(false);
      setSelected(new Set());
      onCreated(res.id);
    } else {
      toast.error(res.error ?? 'Failed');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="New channel"
            className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New channel</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name" autoFocus />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
          />
          <button
            type="button"
            onClick={() => setIsPrivate((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/40"
          >
            <span
              className={cn(
                'grid size-4 place-items-center rounded border',
                isPrivate ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
              )}
            >
              {isPrivate && <Check className="size-3" />}
            </span>
            <Lock className="size-3.5 text-muted-foreground" />
            Private — invite-only
          </button>

          {members.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Add members</p>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/50 p-1">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary/50"
                  >
                    <span
                      className={cn(
                        'grid size-4 place-items-center rounded border',
                        selected.has(m.id)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/40',
                      )}
                    >
                      {selected.has(m.id) && <Check className="size-3" />}
                    </span>
                    <span className="grid size-6 place-items-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                      {initials(m.fullName)}
                    </span>
                    <span className="flex-1 truncate">{m.fullName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
          <Button type="button" onClick={submit} loading={saving} disabled={!name.trim()}>
            Create channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewDmDialog({
  members,
  onOpened,
}: {
  members: Member[];
  onOpened: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function start(id: string) {
    setBusy(id);
    const res = await openDm(id);
    setBusy(null);
    if (res.ok && res.id) {
      setOpen(false);
      setQ('');
      onOpened(res.id);
    } else {
      toast.error(res.error ?? 'Failed');
    }
  }

  const filtered = members.filter((m) => m.fullName.toLowerCase().includes(q.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="New direct message"
            className="grid size-5 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New direct message</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teammates…" className="pl-9" autoFocus />
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">No teammates found.</p>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => start(m.id)}
                disabled={busy === m.id}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary/50 disabled:opacity-60"
              >
                <span className="grid size-8 place-items-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground">
                  {initials(m.fullName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{m.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                {busy === m.id && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
