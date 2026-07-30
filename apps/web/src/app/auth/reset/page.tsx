'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/password-reset/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: next }),
      });
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push('/login'), 1800);
      } else {
        const body = (await res.json().catch(() => ({}))) as { detail?: string; title?: string };
        setError(body.detail ?? body.title ?? 'Could not reset password');
        setSaving(false);
      }
    } catch {
      setError('Network error');
      setSaving(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/15 via-background to-background" />
      <main className="relative z-10 w-full max-w-md px-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col gap-6 rounded-3xl border border-border/40 bg-background/60 p-8 shadow-2xl shadow-foreground/5 backdrop-blur-xl ring-1 ring-border/50">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-linear-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/30">
              {done ? <CheckCircle2 className="size-5" /> : <KeyRound className="size-5" />}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {done ? 'Password updated' : 'Set a new password'}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {done ? 'Redirecting you to sign in…' : 'Choose a strong password you don&apos;t use elsewhere.'}
            </p>
          </div>

          {!done && (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="new">New password (min 8 chars)</Label>
                <Input
                  id="new"
                  type="password"
                  minLength={8}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  required
                  autoFocus
                  className="h-12 rounded-xl bg-secondary/30 px-4 border-border/50"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
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
                loading={saving}
                disabled={!token}
                className="h-12 w-full rounded-xl bg-linear-to-r from-primary to-primary/80 font-semibold cursor-pointer"
              >
                Update password
              </Button>
              <Link
                href="/login"
                className="text-center text-sm font-medium text-muted-foreground hover:text-primary cursor-pointer"
              >
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResetForm />
    </Suspense>
  );
}
