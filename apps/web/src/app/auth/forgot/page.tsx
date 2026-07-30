'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Mail, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Mode = 'choose' | 'reset' | 'magic';

export default function ForgotPage() {
  const [mode, setMode] = useState<Mode>('choose');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError('Enter your email');
      return;
    }
    setSending(true);
    setError(null);
    const url =
      mode === 'reset' ? '/api/auth/password-reset/request' : '/api/auth/magic-link/request';
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch {
      setError('Network error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/15 via-background to-background" />

      <main className="relative z-10 w-full max-w-md px-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col gap-6 rounded-3xl border border-border/40 bg-background/60 p-8 shadow-2xl shadow-foreground/5 backdrop-blur-xl ring-1 ring-border/50">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-linear-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-primary/50">
              <KeyRound className="size-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Trouble signing in?</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {sent
                ? 'Check your email'
                : mode === 'choose'
                ? 'Choose how you want to get back in'
                : mode === 'reset'
                ? 'We&apos;ll email you a link to set a new password'
                : 'We&apos;ll email you a one-time sign-in link'}
            </p>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-primary/5 p-6 text-center">
              <MailCheck className="size-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                If an account exists for <span className="font-medium text-foreground">{email}</span>,
                a {mode === 'reset' ? 'password reset' : 'sign-in'} link is on its way.
              </p>
            </div>
          ) : mode === 'choose' ? (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setMode('reset')}
                className="group flex items-center gap-4 rounded-2xl border border-border/50 p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/5 active:scale-[0.99] cursor-pointer "
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <KeyRound className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold group-hover:text-primary">Reset my password</span>
                  <span className="text-xs text-muted-foreground">Set a brand-new password via email</span>
                </span>
              </button>
              <button
                onClick={() => setMode('magic')}
                className="group flex items-center gap-4 rounded-2xl border border-border/50 p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/5 active:scale-[0.99] cursor-pointer"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold group-hover:text-primary">Email me a login link</span>
                  <span className="text-xs text-muted-foreground">Sign in once without a password</span>
                </span>
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 pl-1">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="h-12 rounded-xl bg-secondary/30 px-4 border-border/50"
                />
              </div>
              {error && (
                <div className="rounded-xl bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                loading={sending}
                className="h-12 w-full rounded-xl bg-linear-to-r from-primary to-primary/80 font-semibold"
              >
                {mode === 'reset' ? 'Send reset link' : 'Send login link'}
              </Button>
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="text-center text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ← Choose a different option
              </button>
            </form>
          )}

          <Link
            href="/login"
            className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Back to sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
