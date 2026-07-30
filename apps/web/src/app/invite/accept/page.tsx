'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Sparkles, UserPlus, XCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface VerifyResult {
  valid: boolean;
  email?: string;
  orgName?: string;
  roleName?: string;
  reason?: string;
}

function Strength({ value }: { value: string }) {
  const score = useMemo(() => {
    let s = 0;
    if (value.length >= 12) s++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) s++;
    if (/\d/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    return s;
  }, [value]);
  if (!value) return null;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-rose-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i < score ? colors[score - 1] : 'bg-border'}`} />
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground">{labels[Math.max(0, score - 1)]}</span>
    </div>
  );
}

function AcceptForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [info, setInfo] = useState<VerifyResult | null>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setInfo({ valid: false, reason: 'Missing invitation token.' });
      return;
    }
    fetch(`/api/invitations/verify?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d: VerifyResult) => setInfo(d))
      .catch(() => setInfo({ valid: false, reason: 'Could not validate this invitation.' }));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 12) return setError('Password must be at least 12 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, fullName, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(data.detail ?? data.title ?? 'Could not accept invitation');
        setSaving(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  if (!info) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking your invitation…
      </div>
    );
  }

  if (!info.valid) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
          <XCircle className="size-7" />
        </div>
        <p className="text-base font-semibold text-foreground">Invitation unavailable</p>
        <p className="max-w-xs text-sm text-muted-foreground">{info.reason ?? 'This invitation link is invalid or has expired.'}</p>
        <Button nativeButton={false} render={<Link href="/login" />} variant="outline" size="sm" className="mt-1">
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/10 to-purple-500/5 p-4">
        <p className="text-sm text-foreground">
          Joining <b>{info.orgName}</b> as <b>{info.roleName}</b>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{info.email}</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="fn">Your full name</Label>
        <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required autoFocus />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pw">Create password</Label>
        <div className="relative">
          <Input id="pw" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 12 characters" className="pr-10" required />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <Strength value={password} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cf">Confirm password</Label>
        <Input id="cf" type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{error}</p>}
      <Button type="submit" loading={saving} className="w-full">
        {!saving && <CheckCircle2 className="size-4" />}
        Accept &amp; join workspace
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        By joining you agree to your workspace&apos;s terms of use.
      </p>
    </form>
  );
}

export default function InviteAcceptPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-background via-background to-primary/5 p-6">
      <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="relative w-full max-w-md rounded-3xl border border-border/50 bg-card/80 p-8 shadow-xl backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-linear-to-br from-primary to-purple-600 text-primary-foreground shadow-lg">
            <UserPlus className="size-5" />
          </span>
          <div>
            <h1 className="flex items-center gap-1.5 text-xl font-bold tracking-tight text-foreground">
              Join Gnevo CRM <Sparkles className="size-4 text-primary" />
            </h1>
            <p className="text-sm text-muted-foreground">Set up your account to get started.</p>
          </div>
        </div>
        <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>}>
          <AcceptForm />
        </Suspense>
      </div>
    </div>
  );
}
