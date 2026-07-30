import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, Globe, Mail, Phone, User } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomerStatusBadge } from '../_components/customer-status-badge';
import { AddContactDialog } from './_components/add-contact-dialog';
import { CustomerInsights } from './_components/customer-insights';
import { AccountManagerCard } from './_components/account-manager-card';
import { PortalLinkButton } from './_components/portal-link-button';
import { EditCustomerDialog } from './_components/edit-customer-dialog';
import { ActivityTimeline } from '@/components/activity-timeline';
import { Attachments } from '@/components/attachments';
import { ClientSnapshots } from '@/components/client-snapshots';
import { NotesTimeline } from '@/components/notes-timeline';
import { TagEditor } from '@/components/tag-editor';

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
}
interface CustomFieldDef {
  key: string;
  label: string;
  type: string;
}
interface Customer {
  id: string;
  name: string;
  type: string;
  status: string;
  industry: string | null;
  website: string | null;
  custom: Record<string, string> | null;
  tags: string[] | null;
  contacts: Contact[];
  accountManager: { id: string; fullName: string } | null;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-border/40 py-3.5 last:border-0 transition-colors">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground capitalize">{value ?? '—'}</dd>
    </div>
  );
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let customer: Customer;
  try {
    customer = await apiServer<Customer>(`/v1/customers/${id}`);
  } catch {
    notFound();
  }

  let customFields: CustomFieldDef[] = [];
  try {
    customFields = await apiServer<CustomFieldDef[]>('/v1/org/custom-fields?entity=customer');
  } catch {
    /* ignore */
  }

  const initials = customer.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Button
        nativeButton={false}
        render={<Link href="/customers" />}
        variant="ghost"
        size="sm"
        className="w-fit px-0 hover:bg-transparent hover:underline text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to customers
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 text-lg font-bold text-primary ring-1 ring-primary/20 shadow-sm">
            {initials}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{customer.name}</h1>
            <div className="flex items-center gap-2">
              <CustomerStatusBadge status={customer.status} />
              <span className="text-xs text-muted-foreground capitalize">{customer.type}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditCustomerDialog customer={customer} customFields={customFields} />
          <PortalLinkButton customerId={customer.id} />
        </div>
      </div>

      <TagEditor entityType="customer" entityId={customer.id} initialTags={customer.tags ?? []} />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Details Card */}
        <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-4" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Details</h2>
          </div>
          <dl>
            <Row label="Type" value={customer.type} />
            <Row label="Industry" value={customer.industry} />
            <Row
              label="Website"
              value={
                customer.website ? (
                  <a
                    href={`https://${customer.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 normal-case text-primary hover:underline transition-colors"
                  >
                    <Globe className="size-3" />
                    {customer.website}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            {customFields.map((f) => (
              <Row key={f.key} label={f.label} value={customer.custom?.[f.key] || '—'} />
            ))}
          </dl>
        </Card>

        {/* Contacts Card */}
        <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <User className="size-4" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                Contacts
                <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-secondary text-[11px] font-medium text-muted-foreground">
                  {customer.contacts.length}
                </span>
              </h2>
            </div>
            <AddContactDialog customerId={customer.id} />
          </div>

          {customer.contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <User className="size-5" />
              </div>
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-0">
              {customer.contacts.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-1.5 border border-border/60 py-3.5 last:border-0 transition-colors hover:bg-secondary/60 -mx-2 px-2 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="grid size-7 shrink-0 place-items-center rounded-full bg-linear-to-br from-secondary to-secondary/50 text-xs font-bold text-foreground/70">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {c.name}
                      {c.title && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          · {c.title}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pl-9 text-xs text-muted-foreground">
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        <Mail className="size-3" />
                        {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        <Phone className="size-3" />
                        {c.phone}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <AccountManagerCard customerId={customer.id} initial={customer.accountManager} />

      <CustomerInsights customerId={customer.id} />

      <Card className="p-6">
        <ClientSnapshots customerId={customer.id} />
      </Card>

      <Card className="p-6">
        <NotesTimeline entityType="customer" entityId={customer.id} />
      </Card>

      <Card className="p-6">
        <Attachments entityType="customer" entityId={customer.id} />
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Activity</h2>
        <ActivityTimeline entityType="customer" entityId={customer.id} limit={30} />
      </Card>
    </div>
  );
}

