import Link from 'next/link';
import { ArrowLeft, CopyCheck } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DetailLink } from '@/components/detail-link';
import { DupDeleteButton } from './_components/dup-delete-button';
import { MergeDialog } from './_components/merge-dialog';

export const metadata = { title: 'Duplicate leads | Gnevo CRM' };

interface DupLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: string;
  createdAt: string;
}
interface DupGroup {
  email: string;
  leads: DupLead[];
}

export default async function DuplicateLeadsPage() {
  let groups: DupGroup[] = [];
  try {
    groups = await apiServer<DupGroup[]>('/v1/leads/duplicates');
  } catch {
    groups = [];
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button
        nativeButton={false}
        render={<Link href="/leads" />}
        variant="ghost"
        size="sm"
        className="w-fit px-0 hover:bg-transparent hover:underline text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to leads
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Duplicate leads</h1>
        <p className="text-sm text-muted-foreground">
          Leads that share the same email address — review and remove extras.
        </p>
      </div>

      {groups.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <CopyCheck className="size-8 text-emerald-500" />
          <div>
            <p className="text-lg font-semibold">No duplicates found</p>
            <p className="text-sm text-muted-foreground">Every lead has a unique email. Nice.</p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <Card key={g.email} className="p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2.5">
                <span className="font-mono text-sm">{g.email}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
                    {g.leads.length} matches
                  </Badge>
                  <MergeDialog leads={g.leads} />
                </div>
              </div>
              <ul className="divide-y divide-border/40">
                {g.leads.map((l, i) => (
                  <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <DetailLink href={`/leads/${l.id}`} className="truncate text-sm font-medium hover:text-primary">
                        {l.name}
                      </DetailLink>
                      <span className="text-xs text-muted-foreground">
                        {l.company ?? 'No company'} · {l.status}
                        {i === 0 && ' · oldest'}
                      </span>
                    </div>
                    <DupDeleteButton id={l.id} />
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
