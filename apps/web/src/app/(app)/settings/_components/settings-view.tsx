'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Copy,
  KeyRound,
  Save,
  ShieldCheck,
  UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  updateProfile,
  changePassword,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
} from '../actions';

interface Props {
  fullName: string;
  email: string;
  mfaEnabled: boolean;
  section?: 'account' | 'security';
}

export function SettingsView({ fullName, email, mfaEnabled, section = 'account' }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Account form
  const [name, setName] = useState(fullName);
  const [mail, setMail] = useState(email);

  // Password form
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  // Two-factor
  const [mfaOn, setMfaOn] = useState(mfaEnabled);
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaPending, startMfa] = useTransition();
  const [secretCopied, setSecretCopied] = useState(false);

  function beginSetup() {
    startMfa(async () => {
      const res = await setupTwoFactor();
      if (res.ok && res.qr && res.secret) setSetup({ qr: res.qr, secret: res.secret });
      else toast.error(res.error ?? 'Could not start setup');
    });
  }

  function confirmEnable() {
    startMfa(async () => {
      const res = await enableTwoFactor(mfaCode.trim());
      if (res.ok) {
        toast.success('Two-factor authentication enabled');
        setMfaOn(true);
        setSetup(null);
        setMfaCode('');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Invalid code');
      }
    });
  }

  function disable() {
    startMfa(async () => {
      const res = await disableTwoFactor(mfaCode.trim());
      if (res.ok) {
        toast.success('Two-factor authentication disabled');
        setMfaOn(false);
        setMfaCode('');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Could not disable');
      }
    });
  }

  function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProfile({ fullName: name.trim(), email: mail.trim() });
      if (res.ok) {
        toast.success('Profile updated');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Could not update');
      }
    });
  }

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast.error('New passwords do not match');
      return;
    }
    startTransition(async () => {
      const res = await changePassword({ currentPassword: current, newPassword: next });
      if (res.ok) {
        toast.success('Password changed');
        setCurrent('');
        setNext('');
        setConfirm('');
      } else {
        toast.error(res.error ?? 'Could not change password');
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Account */}
      {section === 'account' && (
      <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <UserCircle className="size-4" />
          </div>
          <h2 className="text-sm font-semibold">Account Information</h2>
        </div>
        <form onSubmit={saveAccount} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={mail}
              onChange={(e) => setMail(e.target.value)}
              required
            />
          </div>
          <div>
            <Button
              type="submit"
              loading={pending}
              disabled={pending || (name === fullName && mail === email)}
            >
              {!pending && <Save className="size-4" />}
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>
      )}

      {/* Change password */}
      {section === 'security' && (
      <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="size-4" />
          </div>
          <h2 className="text-sm font-semibold">Change Password</h2>
        </div>
        <form onSubmit={savePassword} className="flex max-w-md flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="current">Current password</Label>
            <Input
              id="current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new">New password (min 8 chars)</Label>
            <Input
              id="new"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <div>
            <Button type="submit" loading={pending}>
              {pending ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </form>
      </Card>
      )}

      {/* Two-factor */}
      {section === 'security' && (
      <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-4" />
            </div>
            <h2 className="text-sm font-semibold">Two-Factor Authentication</h2>
          </div>
          <Badge
            variant="outline"
            className={
              mfaOn
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400'
                : ''
            }
          >
            {mfaOn ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        {mfaOn ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Your account is protected with an authenticator app. Enter a current code to turn it
              off.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-2">
                <Label htmlFor="mfa-disable">Authenticator code</Label>
                <Input
                  id="mfa-disable"
                  inputMode="numeric"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit code"
                  className="w-40 text-center font-mono tracking-widest"
                />
              </div>
              <Button
                variant="destructive"
                onClick={disable}
                loading={mfaPending}
                disabled={mfaCode.length < 6}
              >
                Disable 2FA
              </Button>
            </div>
          </div>
        ) : setup ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with Google Authenticator, Authy or 1Password, then enter the code
              it shows.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <img
                src={setup.qr}
                alt="2FA QR code"
                className="size-40 rounded-lg border border-border/50 bg-white p-2"
              />
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Or enter this key manually
                </span>
                <div className="flex items-center gap-2">
                  <code className="rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 font-mono text-xs font-medium tracking-wider text-foreground break-all">
                    {setup.secret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    title="Copy key"
                    onClick={() => {
                      navigator.clipboard.writeText(setup.secret).catch(() => undefined);
                      setSecretCopied(true);
                      toast.success('Key copied');
                      setTimeout(() => setSecretCopied(false), 2000);
                    }}
                  >
                    {secretCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-2">
                <Label htmlFor="mfa-enable">Enter code to confirm</Label>
                <Input
                  id="mfa-enable"
                  inputMode="numeric"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit code"
                  className="w-40 text-center font-mono tracking-widest"
                />
              </div>
              <Button onClick={confirmEnable} loading={mfaPending} disabled={mfaCode.length < 6}>
                Verify &amp; enable
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSetup(null);
                  setMfaCode('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security with a TOTP authenticator app (Google Authenticator,
              Authy, 1Password).
            </p>
            <Button variant="outline" className="w-fit" onClick={beginSetup} loading={mfaPending}>
              <ShieldCheck className="size-4" />
              Enable 2FA
            </Button>
          </div>
        )}
      </Card>
      )}

    </div>
  );
}
