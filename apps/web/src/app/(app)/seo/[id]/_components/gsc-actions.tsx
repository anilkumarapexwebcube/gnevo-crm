'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { connectGsc, syncGsc } from '../../actions';

export function GscActions({ id, connected }: { id: string; connected: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function connect() {
    startTransition(async () => {
      const res = await connectGsc(id);
      if (res.ok && res.url) window.location.assign(res.url);
      else toast.error(res.error ?? 'Could not start Google connect');
    });
  }

  function sync() {
    startTransition(async () => {
      const res = await syncGsc(id);
      if (res.ok) {
        toast.success(`Synced ${res.synced ?? 0} keywords from Search Console`);
        router.refresh();
      } else {
        toast.error(res.error ?? 'Sync failed');
      }
    });
  }

  if (!connected) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={connect}
        disabled={pending}
        className="rounded-full border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all shadow-sm disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Link2 className="size-4" />
        )}
        Connect Search Console
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={sync}
      disabled={pending}
      className="rounded-full border-green-500/30 text-green-600 hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-700 transition-all shadow-sm disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      {pending ? 'Syncing…' : 'Sync from GSC'}
    </Button>
  );
}
