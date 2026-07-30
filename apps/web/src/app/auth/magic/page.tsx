'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ShieldAlert } from 'lucide-react';

function MagicVerify() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get('token');
    if (!token) {
      setError('This sign-in link is missing its token.');
      return;
    }
    (async () => {
      const res = await fetch('/api/auth/magic-link/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        const body = (await res.json().catch(() => ({}))) as { detail?: string; title?: string };
        setError(body.detail ?? body.title ?? 'This sign-in link is invalid or has expired.');
      }
    })();
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        {error ? (
          <>
            <ShieldAlert className="size-8 text-destructive" />
            <p className="text-lg font-semibold">Sign-in failed</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link href="/login" className="text-sm font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function MagicVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <MagicVerify />
    </Suspense>
  );
}
