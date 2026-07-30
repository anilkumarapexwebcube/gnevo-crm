'use client';

import { useEffect, useRef } from 'react';

/**
 * Signs the user out after `minutes` of no interaction (0 disables it).
 * Activity across tabs resets the timer via localStorage ping.
 */
export function IdleWatcher({ minutes }: { minutes: number }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mins = Number(minutes);
    if (!Number.isFinite(mins) || mins <= 0) return; // "Never" → no auto sign-out
    const ms = mins * 60_000;

    async function logout() {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        /* ignore */
      }
      window.location.href = '/login?timeout=1';
    }

    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(logout, ms);
    }

    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    const onActivity = () => reset();
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [minutes]);

  return null;
}
