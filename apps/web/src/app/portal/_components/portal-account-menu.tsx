'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, LogOut, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function PortalAccountMenu({ name, phone }: { name: string; phone: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [pName, setPName] = useState(name);
  const [pPhone, setPPhone] = useState(phone ?? '');
  const [pending, startTransition] = useTransition();
  const [loggingOut, setLoggingOut] = useState(false);

  function logout() {
    setLoggingOut(true);
    startTransition(async () => {
      await fetch('/api/portal/logout', { method: 'POST' }).catch(() => undefined);
      router.push('/portal/login');
      router.refresh();
      // Keep the spinner until navigation completes (don't reset loggingOut).
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)}>
          <UserCog className="size-4" />
          Profile
        </Button>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update your name and contact number.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await fetch('/api/portal/profile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: pName, phone: pPhone }),
                });
                if (res.ok) {
                  toast.success('Profile updated');
                  setProfileOpen(false);
                  router.refresh();
                } else {
                  const b = (await res.json().catch(() => ({}))) as { detail?: string };
                  toast.error(b.detail ?? 'Could not update profile');
                }
              });
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="pname">Full name</Label>
              <Input id="pname" value={pName} onChange={(e) => setPName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pphone">Phone</Label>
              <Input id="pphone" value={pPhone} onChange={(e) => setPPhone(e.target.value)} placeholder="+1 555 000 1234" />
            </div>
            <DialogFooter>
              <Button type="submit" loading={pending}>{pending ? 'Saving…' : 'Save profile'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <KeyRound className="size-4" />
          Change password
        </Button>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Update the password for your client portal login.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await fetch('/api/portal/change-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ currentPassword: current, newPassword: next }),
                });
                if (res.ok) {
                  toast.success('Password updated');
                  setOpen(false);
                  setCurrent('');
                  setNext('');
                } else {
                  const body = (await res.json().catch(() => ({}))) as { detail?: string };
                  toast.error(body.detail ?? 'Could not update password');
                }
              });
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="current">Current password</Label>
              <Input
                id="current"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="next">New password (min 8 chars)</Label>
              <Input
                id="next"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" loading={pending}>
                {pending ? 'Saving…' : 'Update password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOut} onOpenChange={(v) => !loggingOut && setConfirmOut(v)}>
        <Button variant="outline" size="sm" onClick={() => setConfirmOut(true)}>
          <LogOut className="size-4" />
          Sign out
        </Button>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>
              You&apos;ll need your email and password to sign back in to the portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loggingOut}
              onClick={() => setConfirmOut(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" loading={loggingOut} onClick={logout}>
              {!loggingOut && <LogOut className="size-4" />}
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
