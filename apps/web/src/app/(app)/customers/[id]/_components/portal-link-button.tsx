'use client';

import { useState, useTransition } from 'react';
import { Check, Copy, Eye, EyeOff, ShieldCheck, ShieldOff, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  listPortalContacts,
  enablePortalAccess,
  disablePortalAccess,
  setPortalPermissions,
  getPortalShareable,
  setPortalVisibility,
  type PortalContact,
  type Shareable,
} from '../actions';

/** Agency-side manager: grant/revoke client-portal login per contact. */
export function PortalLinkButton({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginUrl, setLoginUrl] = useState<string>('');
  const [contacts, setContacts] = useState<PortalContact[]>([]);
  const [pending, startTransition] = useTransition();
  // Freshly issued credentials, shown once.
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareable, setShareable] = useState<Shareable | null>(null);

  function load() {
    setLoading(true);
    startTransition(async () => {
      const res = await listPortalContacts(customerId);
      if (res.ok) {
        setContacts(res.contacts ?? []);
        setLoginUrl(res.loginUrl ?? '');
      } else {
        toast.error(res.error ?? 'Could not load');
      }
      setLoading(false);
    });
    getPortalShareable(customerId).then(setShareable);
  }

  function togglePerm(c: PortalContact, key: 'projects' | 'invoices' | 'tickets') {
    const map = { projects: 'portalCanProjects', invoices: 'portalCanInvoices', tickets: 'portalCanTickets' } as const;
    const field = map[key];
    const nextVal = !c[field];
    setContacts((prev) => prev.map((x) => (x.id === c.id ? { ...x, [field]: nextVal } : x)));
    startTransition(async () => {
      const res = await setPortalPermissions(customerId, c.id, { [key]: nextVal });
      if (!res.ok) {
        toast.error(res.error ?? 'Failed');
        setContacts((prev) => prev.map((x) => (x.id === c.id ? { ...x, [field]: !nextVal } : x)));
      }
    });
  }

  function toggleVisibility(type: 'project' | 'invoice' | 'ticket', id: string, visible: boolean) {
    const listKey = (type + 's') as keyof Shareable;
    setShareable((prev) => (prev ? { ...prev, [listKey]: prev[listKey].map((r) => (r.id === id ? { ...r, visible } : r)) } : prev));
    startTransition(async () => {
      const res = await setPortalVisibility(customerId, type, id, visible);
      if (!res.ok) toast.error(res.error ?? 'Failed');
    });
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setIssued(null);
      load();
    }
  }

  function enable(contact: PortalContact) {
    startTransition(async () => {
      const res = await enablePortalAccess(customerId, contact.id);
      if (res.ok && res.tempPassword && res.email) {
        setIssued({ email: res.email, password: res.tempPassword });
        toast.success('Portal access enabled');
        load();
      } else {
        toast.error(res.error ?? 'Could not enable');
      }
    });
  }

  function disable(contact: PortalContact) {
    startTransition(async () => {
      const res = await disablePortalAccess(customerId, contact.id);
      if (res.ok) {
        toast.success('Portal access revoked');
        if (issued?.email === contact.email) setIssued(null);
        load();
      } else {
        toast.error(res.error ?? 'Could not disable');
      }
    });
  }

  async function copyCredentials() {
    if (!issued) return;
    const text = `Gnevo client portal\nSign in: ${loginUrl}\nEmail: ${issued.email}\nTemporary password: ${issued.password}`;
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(true);
    toast.success('Login details copied');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(true)}>
        <UserCog className="size-4" />
        Portal access
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Client portal access</DialogTitle>
          <DialogDescription>
            Grant a contact a login to view this customer&apos;s invoices, projects and tickets.
          </DialogDescription>
        </DialogHeader>

        {issued && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="mb-2 font-medium">Share these login details securely — shown once:</p>
            <div className="flex flex-col gap-0.5 font-mono text-xs">
              <span>Sign in: {loginUrl}</span>
              <span>Email: {issued.email}</span>
              <span>Password: {issued.password}</span>
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={copyCredentials}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy login details'}
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
          ) : contacts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No contacts yet. Add a contact with an email first.
            </p>
          ) : (
            contacts.map((c) => (
              <div key={c.id} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{c.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {c.email ?? 'No email'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {c.portalEnabled ? (
                    <>
                      <Badge variant="outline" className="gap-1 text-emerald-600">
                        <ShieldCheck className="size-3" />
                        Enabled
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => enable(c)}
                        title="Issue a new temporary password"
                      >
                        Reset
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => disable(c)}
                      >
                        <ShieldOff className="size-4" />
                        Revoke
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending || !c.email}
                      onClick={() => enable(c)}
                    >
                      Enable
                    </Button>
                  )}
                </div>
                </div>

                {c.portalEnabled && (
                  <div className="flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
                    <span className="text-[11px] text-muted-foreground">Can see:</span>
                    {([['projects', c.portalCanProjects], ['invoices', c.portalCanInvoices], ['tickets', c.portalCanTickets]] as const).map(([key, on]) => (
                      <button
                        key={key}
                        type="button"
                        disabled={pending}
                        onClick={() => togglePerm(c, key)}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize transition-colors',
                          on ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground line-through',
                        )}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {shareable && (shareable.projects.length + shareable.invoices.length + shareable.tickets.length > 0) && (
          <div className="mt-1 border-t pt-3">
            <p className="mb-2 text-sm font-medium">What clients can see</p>
            <p className="mb-2 text-xs text-muted-foreground">Toggle individual records off to hide them from the portal.</p>
            <div className="flex max-h-56 flex-col gap-3 overflow-y-auto">
              {([['project', 'Projects', shareable.projects], ['invoice', 'Invoices', shareable.invoices], ['ticket', 'Tickets', shareable.tickets]] as const).map(([type, label, list]) =>
                list.length === 0 ? null : (
                  <div key={type}>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                    <div className="flex flex-col divide-y divide-border/30">
                      {list.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-2 py-1.5">
                          <span className="truncate text-sm">{r.label}</span>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => toggleVisibility(type, r.id, !r.visible)}
                            className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors', r.visible ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-secondary')}
                          >
                            {r.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                            {r.visible ? 'Visible' : 'Hidden'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
