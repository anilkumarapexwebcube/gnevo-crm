'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { Send, User, Sparkles, Loader2, X, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import type { TicketStatus } from '@gnevo/types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RichTextEditor } from '@/components/rich-text-editor';
import { addTicketMessage, updateTicket } from '../../actions';
import { TICKET_STATUSES } from '../../_lib/styles';
import { askAi } from '@/app/(app)/ai/actions';
import { listMacros, useMacro, type Macro } from '@/lib/macros-actions';

interface Message {
  id: string;
  body: string;
  createdAt: string;
  author: { fullName: string } | null;
}

export function TicketThread({
  id,
  status,
  subject,
  description,
  customerName,
  messages,
}: {
  id: string;
  status: string;
  subject: string;
  description: string;
  customerName?: string;
  messages: Message[];
}) {
  const router = useRouter();
  const [reply, setReply] = useState('');
  const [syncSignal, setSyncSignal] = useState(0);
  const [aiDraft, setAiDraft] = useState(false);
  const [pending, startTransition] = useTransition();
  const [aiPending, setAiPending] = useState(false);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [macroOpen, setMacroOpen] = useState(false);

  useEffect(() => {
    listMacros().then(setMacros);
  }, []);

  function substitute(body: string): string {
    return body
      .replace(/\{\{\s*customer_name\s*\}\}/gi, customerName || 'there')
      .replace(/\{\{\s*company_name\s*\}\}/gi, customerName || 'your company')
      .replace(/\{\{\s*ticket_id\s*\}\}/gi, id.slice(0, 8))
      .replace(/\{\{\s*order_id\s*\}\}/gi, '');
  }

  function insertMacro(m: Macro) {
    setReply((r) => (r && r !== '<p></p>' ? `${r}${substitute(m.body)}` : substitute(m.body)));
    setSyncSignal((s) => s + 1);
    void useMacro(m.id);
    setMacroOpen(false);
  }

  function changeStatus(next: string) {
    startTransition(async () => {
      const res = await updateTicket(id, { status: next as TicketStatus });
      if (res.ok) {
        toast.success('Status updated');
        router.refresh();
      } else toast.error(res.error ?? 'Failed');
    });
  }

  function send() {
    const body = reply.trim();
    if (!body || body === '<p></p>') return;
    startTransition(async () => {
      const res = await addTicketMessage(id, body);
      if (res.ok) {
        setReply('');
        setSyncSignal((s) => s + 1);
        setAiDraft(false);
        router.refresh();
      } else toast.error(res.error ?? 'Failed to send');
    });
  }

  async function generateAiReply() {
    setAiPending(true);
    const thread = messages.map((m) => `${m.author?.fullName ?? 'System'}: ${m.body.replace(/<[^>]+>/g, ' ')}`).join('\n');
    const prompt = [
      `You are a professional customer support agent. Draft a helpful, empathetic reply to this ticket.`,
      `Ticket subject: ${subject}`,
      `Customer description: ${description}`,
      thread ? `\nConversation so far:\n${thread}` : '',
      `\nWrite only the reply text. Concise, professional, friendly. No greetings like "Dear Customer" or signatures.`,
    ]
      .filter(Boolean)
      .join('\n');
    const res = await askAi([{ role: 'user', content: prompt }]);
    setAiPending(false);
    if (res.ok && res.text) {
      setReply(`<p>${res.text.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`);
      setSyncSignal((s) => s + 1);
      setAiDraft(true);
      toast.success('AI draft ready — review before sending');
    } else {
      toast.error(res.error ?? 'AI generation failed');
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-border/40 pb-4">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Status</span>
        <Select items={TICKET_STATUSES} value={status} onValueChange={(v) => changeStatus(v ?? status)}>
          <SelectTrigger size="sm" className="w-40 rounded-full bg-secondary/30 border-0 ring-1 ring-border/50 hover:bg-secondary/50 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {TICKET_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="rounded-lg cursor-pointer">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No replies yet.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex gap-3">
              <div className="mt-auto shrink-0 grid size-8 place-items-center rounded-full bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
                {m.author ? <span className="text-xs font-bold">{m.author.fullName.charAt(0)}</span> : <User className="size-4" />}
              </div>
              <div className="relative flex flex-col gap-1 max-w-[85%]">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-medium text-foreground">{m.author?.fullName ?? 'System'}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <div
                  className="article-content px-5 py-3.5 bg-card border border-border/50 text-foreground rounded-[24px] rounded-bl-[8px] shadow-sm text-[14px] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.body) }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {aiDraft && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 to-purple-500/5 p-4 ring-1 ring-primary/10">
          <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/80 mb-1">AI Draft — review before sending</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">Edit the reply below freely before sending.</p>
          </div>
          <button onClick={() => { setAiDraft(false); setReply(''); setSyncSignal((s) => s + 1); }} className="shrink-0 grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" aria-label="Dismiss AI draft">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div
          onKeyDownCapture={(e) => {
            if (e.key === '/' && (reply === '' || reply === '<p></p>')) {
              e.preventDefault();
              setMacroOpen(true);
            }
          }}
        >
          <RichTextEditor
            value={reply}
            onChange={setReply}
            syncSignal={syncSignal}
            placeholder="Write a reply…  (press / for macros)"
            minHeightClass="min-h-28"
          />
        </div>

        <div className="flex items-center justify-between px-1">
          <DropdownMenu open={macroOpen} onOpenChange={setMacroOpen}>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/30 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                >
                  <MessageSquareText className="size-3" />
                  Macros
                </button>
              }
            />
            <DropdownMenuContent align="start" className="max-h-72 w-72 overflow-y-auto">
              {macros.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">No macros. Add them in Settings → Workspace.</div>
              ) : (
                macros.map((m) => (
                  <DropdownMenuItem key={m.id} onClick={() => insertMacro(m)} className="flex flex-col items-start gap-0.5">
                    <span className="text-sm font-medium">{m.title}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">{m.body.replace(/<[^>]+>/g, ' ')}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2">
            <button
              onClick={generateAiReply}
              disabled={aiPending || pending}
              className="group flex items-center gap-1.5 rounded-full border border-primary/20 bg-linear-to-r from-primary/10 to-purple-500/10 px-3 py-1.5 text-[12px] font-semibold text-primary shadow-sm transition-all hover:shadow-md hover:border-primary/40 disabled:opacity-60"
            >
              {aiPending ? <><Loader2 className="size-3 animate-spin" />Generating…</> : <><Sparkles className="size-3" />Generate with AI</>}
            </button>
            <Button onClick={send} disabled={pending || !reply.trim() || reply === '<p></p>'} size="sm">
              <Send className="size-4" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
