'use client';

import { useRef, useState, useTransition, useEffect } from 'react';
import { ArrowUp, Sparkles, User, Loader2 } from 'lucide-react';
import type { AiMessage } from '@gnevo/types';
import { Button } from '@/components/ui/button';

import { askAi } from '../actions';

const SUGGESTIONS = [
  'Draft a follow-up email for a new lead',
  'Suggest 5 SEO blog topics for a dental clinic',
  'Write a short proposal intro for a PPC retainer',
];

export function AiChat() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, pending]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const next: AiMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setError(null);
    startTransition(async () => {
      const res = await askAi(next);
      if (res.ok && res.text) {
        setMessages([...next, { role: 'assistant', content: res.text }]);
      } else {
        setError(res.error ?? 'Failed to get a response');
      }
    });
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-4xl flex-col gap-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center justify-center py-6 pb-2 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-primary/20 mb-3">
          <Sparkles className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          AI Assistant
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Your intelligent co-pilot. Multi-provider routed to your configured AI key.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-4 py-6 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Try asking</p>
              <div className="flex flex-col gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 text-left shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="relative flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{s}</span>
                      <ArrowUp className="size-4 text-muted-foreground/50 transition-all group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`mt-auto shrink-0 grid size-8 place-items-center rounded-full shadow-sm ring-1 ${m.role === 'user'
                    ? 'bg-secondary text-secondary-foreground ring-border/50'
                    : 'bg-primary text-primary-foreground ring-primary/20'
                  }`}>
                  {m.role === 'user' ? <User className="size-4" /> : <Sparkles className="size-4" />}
                </div>
                <div
                  className={`relative px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${m.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-[24px] rounded-br-[8px]'
                      : 'bg-card border border-border/50 text-foreground rounded-[24px] rounded-bl-[8px]'
                    }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            </div>
          ))
        )}

        {pending && (
          <div className="flex w-full justify-start">
            <div className="flex gap-3 max-w-[85%] sm:max-w-[75%] flex-row">
              <div className="mt-auto shrink-0 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
                <Sparkles className="size-4" />
              </div>
              <div className="relative px-5 py-3.5 bg-card border border-border/50 text-foreground rounded-[24px] rounded-bl-[8px] shadow-sm flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 px-4 py-1.5 text-xs font-medium text-destructive ring-1 ring-destructive/20">
              {error}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-4 pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="relative mx-auto max-w-3xl flex items-end gap-2 rounded-[28px] border border-border/50 bg-card/80 backdrop-blur-xl p-2 shadow-lg ring-1 ring-border/5 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all duration-300"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask anything... (Enter to send, Shift+Enter for newline)"
            className="max-h-40 flex-1 resize-none bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground/60"
            style={{ minHeight: '44px' }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={pending || !input.trim()}
            className="shrink-0 size-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 mb-0.5 mr-0.5"
          >
            <ArrowUp className="size-5" />
          </Button>
        </form>
        <p className="mt-3 text-center text-[11px] font-medium text-muted-foreground/60">
          AI can make mistakes. Consider verifying important information.
        </p>
      </div>
    </div>
  );
}
