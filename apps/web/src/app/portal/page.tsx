import { redirect } from 'next/navigation';
import { FileText, FolderKanban, LifeBuoy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { portalApiServer } from '@/lib/portal-session';
import { PortalAccountMenu } from './_components/portal-account-menu';

interface Profile {
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  company: string;
  accountManager: string | null;
}

interface PortalData {
  customer: { name: string };
  permissions: { projects: boolean; invoices: boolean; tickets: boolean };
  invoices: { number: string; status: string; currency: string; issuedAt: string; total: number }[];
  tickets: { subject: string; status: string; priority: string; createdAt: string }[];
  projects: { name: string; status: string }[];
}

export default async function PortalDashboard() {
  let profile: Profile;
  let data: PortalData;
  try {
    [profile, data] = await Promise.all([
      portalApiServer<Profile>('/v1/portal/auth/me'),
      portalApiServer<PortalData>('/v1/portal/data'),
    ]);
  } catch {
    // Cookie present but token expired/invalid → back to login.
    redirect('/portal/login');
  }

  const statusStyle = (s: string) =>
    ({
      draft: 'bg-slate-100 text-slate-600 border-slate-200',
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      sent: 'bg-blue-100 text-blue-700 border-blue-200',
      paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      void: 'bg-rose-100 text-rose-700 border-rose-200',
    })[s] ?? '';

  const money = (v: number, c: string) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(v);
  const date = (v: string) =>
    new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
            G
          </span>
          <div>
            <p className="text-xs text-muted-foreground">
              Client portal · {data.customer.name}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome, {profile.name.split(' ')[0]}
            </h1>
          </div>
        </div>
        <PortalAccountMenu name={profile.name} phone={profile.phone} />
      </header>

      {profile.accountManager && (
        <Card className="flex items-center gap-3 rounded-2xl p-4">
          <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {profile.accountManager.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Your account manager</p>
            <p className="text-sm font-semibold text-foreground">{profile.accountManager}</p>
          </div>
        </Card>
      )}

      {data.permissions.invoices && (
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="size-4 text-muted-foreground" />
          Invoices
        </h2>
        {data.invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <Card className="divide-y p-0">
            {data.invoices.map((inv) => (
              <div key={inv.number} className="flex items-center justify-between p-4">
                <div className="flex flex-col">
                  <span className="font-mono text-sm">{inv.number}</span>
                  <span className="text-xs text-muted-foreground">{date(inv.issuedAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`capitalize ${statusStyle(inv.status)}`}>
                    {inv.status}
                  </Badge>
                  <span className="text-sm font-medium tabular-nums">
                    {money(inv.total, inv.currency)}
                  </span>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
      )}

      {data.permissions.projects && (
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <FolderKanban className="size-4 text-muted-foreground" />
          Projects
        </h2>
        {data.projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        ) : (
          <Card className="divide-y p-0">
            {data.projects.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <span className="text-sm">{p.name}</span>
                <Badge variant="outline" className="capitalize">
                  {p.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </Card>
        )}
      </section>
      )}

      {data.permissions.tickets && (
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <LifeBuoy className="size-4 text-muted-foreground" />
          Support tickets
        </h2>
        {data.tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets.</p>
        ) : (
          <Card className="divide-y p-0">
            {data.tickets.map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-4">
                <div className="flex flex-col">
                  <span className="text-sm">{t.subject}</span>
                  <span className="text-xs text-muted-foreground">{date(t.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {t.priority}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {t.status}
                  </Badge>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
      )}

      <p className="pt-4 text-center text-xs text-muted-foreground">
        Read-only client portal · Gnevo CRM
      </p>
    </main>
  );
}
