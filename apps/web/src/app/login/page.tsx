'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [mfaStep, setMfaStep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Which second factors the account has (returned after password step).
  const [mfaMethods, setMfaMethods] = useState<{ totp: boolean; passkey: boolean }>({
    totp: false,
    passkey: false,
  });
  const [mfaToken, setMfaToken] = useState('');
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  async function verifyWithPasskey() {
    if (!mfaToken) return;
    setPasskeyLoading(true);
    setError(null);
    try {
      const optRes = await fetch('/api/auth/passkey/2fa/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken }),
      });
      if (!optRes.ok) throw new Error('options');
      const { options, state } = (await optRes.json()) as { options: unknown; state: string };
      const assertion = await startAuthentication({ optionsJSON: options as never });
      const verifyRes = await fetch('/api/auth/passkey/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken, response: assertion, state }),
      });
      if (verifyRes.ok) {
        setRedirecting(true);
        router.push('/dashboard');
        router.refresh();
        return;
      }
      const body = (await verifyRes.json().catch(() => ({}))) as { detail?: string };
      setError(body.detail ?? 'Passkey verification failed');
      setPasskeyLoading(false);
    } catch (e) {
      if ((e as Error).name !== 'NotAllowedError') setError('Passkey verification failed');
      setPasskeyLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(mfaStep && code ? { code } : {}) }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        title?: string;
        detail?: string;
        mfaRequired?: boolean;
        mfaToken?: string;
        methods?: { totp: boolean; passkey: boolean };
      };
      if (!res.ok) {
        setError(data.detail ?? data.title ?? 'Login failed');
        setLoading(false);
        return;
      }
      // Second factor required — collect it.
      if (data.mfaRequired) {
        setMfaStep(true);
        setMfaMethods(data.methods ?? { totp: false, passkey: false });
        setMfaToken(data.mfaToken ?? '');
        setError(null);
        setLoading(false);
        return;
      }
      // Keep the button disabled while navigation happens (don't reset loading).
      setRedirecting(true);
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Network error');
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/15 via-background to-background" />
      {/* Ambient floating orbs for depth */}
      <div className="pointer-events-none absolute -left-32 top-1/4 size-80 rounded-full bg-primary/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -right-32 bottom-1/4 size-80 rounded-full bg-purple-500/10 blur-3xl animate-pulse [animation-delay:1.2s]" />

      {/* Post-login redirect overlay — premium branded transition to the dashboard */}
      {redirecting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-background/85 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="relative grid size-20 place-items-center">
            <span className="absolute inset-0 rounded-full bg-primary/25 animate-ping" />
            <span className="absolute -inset-2 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <span className="relative grid size-16 place-items-center rounded-3xl bg-linear-to-br from-primary to-primary/60 text-2xl font-bold text-primary-foreground shadow-xl shadow-primary/40">
              G
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-lg font-semibold text-foreground">Signing you in…</p>
            <p className="text-sm text-muted-foreground">Taking you to your workspace</p>
          </div>
        </div>
      )}

      <main className="relative z-10 w-full max-w-md px-6 animate-in fade-in zoom-in-95 duration-700 ease-out">
        <div className="flex flex-col gap-8 rounded-3xl border border-border/40 bg-background/60 p-8 shadow-2xl shadow-foreground/5 backdrop-blur-xl ring-1 ring-border/50">
          
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-linear-to-br from-primary to-primary/60 text-xl font-bold text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-primary/50">
              G
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your Gnevo CRM workspace
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="grid gap-2.5">
              <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 pl-1">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl bg-secondary/30 px-4 transition-all duration-300 hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-primary/30 border-border/50"
              />
            </div>
            <div className="grid gap-2.5">
              <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 pl-1">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter Your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-xl bg-secondary/30 px-4 transition-all duration-300 hover:bg-secondary/50 focus-visible:bg-background focus-visible:ring-primary/30 border-border/50"
              />
            </div>

            {mfaStep && mfaMethods.totp && (
              <div className="grid gap-2.5 animate-in slide-in-from-top-1">
                <Label htmlFor="code" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 pl-1">
                  Authenticator code
                </Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit code"
                  autoFocus
                  required={mfaMethods.totp}
                  className="h-12 rounded-xl bg-secondary/30 px-4 text-center tracking-[0.4em] font-mono transition-all duration-300 focus-visible:bg-background focus-visible:ring-primary/30 border-border/50"
                />
                <p className="pl-1 text-xs text-muted-foreground">
                  Enter the code from your authenticator app to finish signing in.
                </p>
              </div>
            )}

            {mfaStep && mfaMethods.passkey && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                loading={passkeyLoading}
                onClick={verifyWithPasskey}
                className="h-12 w-full rounded-xl"
              >
                {!passkeyLoading && <Fingerprint className="size-4" />}
                Verify with passkey
              </Button>
            )}

            {error && (
              <div className="rounded-xl bg-destructive/10 p-3 text-center text-sm font-medium text-destructive animate-in slide-in-from-top-1">
                {error}
              </div>
            )}

            {!(mfaStep && !mfaMethods.totp) && (
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="mt-3 h-12 w-full rounded-xl bg-linear-to-r from-primary to-primary/80 font-semibold shadow-md shadow-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:opacity-90 active:scale-[0.98]"
              >
                {loading ? 'Signing in…' : mfaStep ? 'Verify & sign in' : 'Sign in'}
              </Button>
            )}

            {!mfaStep && (
              <>
                <Link
                  href="/auth/forgot"
                  className="text-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  Forgot password?
                </Link>
              </>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
