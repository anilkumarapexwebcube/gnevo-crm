'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from './notification-actions';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    startTransition(async () => {
      const res = await fetchNotifications();
      setItems(res.items);
      setUnread(res.unread);
    });
  }, []);

  // Initial load + poll unread every 45s.
  useEffect(() => {
    load();
    const t = setInterval(load, 45000);
    return () => clearInterval(t);
  }, [load]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  function toggle() {
    setOpen((v) => !v);
    if (!open) load();
  }

  function onItemClick(n: NotificationItem) {
    if (!n.readAt) {
      setItems((prev) =>
        prev.map((i) => (i.id === n.id ? { ...i, readAt: new Date().toISOString() } : i)),
      );
      setUnread((u) => Math.max(0, u - 1));
      startTransition(() => markNotificationRead(n.id));
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  function markAll() {
    setItems((prev) => prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
    setUnread(0);
    startTransition(() => markAllNotificationsRead());
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative grid size-9 place-items-center rounded-full border border-border/30 bg-secondary/20 text-muted-foreground transition-all duration-200 hover:border-primary/20 hover:bg-secondary/40 hover:text-foreground cursor-pointer"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-background">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-border/50 bg-popover shadow-xl shadow-foreground/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                <CheckCheck className="size-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Bell className="size-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">You&apos;re all caught up</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onItemClick(n)}
                  className={`flex w-full flex-col gap-0.5 border-b border-border/30 px-4 py-3 text-left transition-colors last:border-0 hover:bg-secondary/40 ${
                    n.readAt ? '' : 'bg-primary/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {!n.readAt && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                    <span className="flex-1 truncate text-sm font-medium">{n.title}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  {n.body && (
                    <span className="truncate pl-0 text-xs text-muted-foreground">{n.body}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
