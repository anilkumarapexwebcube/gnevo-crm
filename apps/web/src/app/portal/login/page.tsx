'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string; message?: string };
        setError(body.detail ?? body.message ?? 'Sign in failed');
        setLoading(false);
        return;
      }
      // Keep the button disabled while navigation happens.
      router.push('/portal');
      router.refresh();
    } catch {
      setError('Network error');
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background" />

      <main className="relative z-10 w-full max-w-md px-6 animate-in fade-in zoom-in-95 duration-700 ease-out">
        <div className="flex flex-col gap-8 rounded-3xl border border-border/40 bg-background/60 p-8 shadow-2xl shadow-foreground/5 backdrop-blur-xl ring-1 ring-border/50">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-xl font-bold text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-primary/50">
              G
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Client portal</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to view your invoices, projects and support tickets
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="grid gap-2.5">
              <Label
                htmlFor="email"
                className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 pl-1"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 rounded-xl bg-secondary/30 px-4 transition-all duration-300 hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-primary/30 border-border/50"
              />
            </div>
            <div className="grid gap-2.5">
              <Label
                htmlFor="password"
                className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 pl-1"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-12 rounded-xl bg-secondary/30 px-4 transition-all duration-300 hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-primary/30 border-border/50"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 p-3 text-center text-sm font-medium text-destructive animate-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="mt-3 h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary/80 font-semibold shadow-md shadow-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:opacity-90 active:scale-[0.98]"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Access is provided by your account manager. Contact them if you need a login.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
