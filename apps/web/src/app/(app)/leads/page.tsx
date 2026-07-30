import Link from 'next/link';
import { CopyCheck, Users } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { DetailLink } from '@/components/detail-link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { NewLeadDialog } from './_components/new-lead-dialog';
import { ImportExportButtons } from '@/components/import-export-buttons';
import { LeadRowActions } from './_components/lead-row-actions';
import { StatusBadge } from './_components/status-badge';
import { LeadsFilterBar } from './_components/leads-filter-bar';
import { SavedViews } from './_components/saved-views';
import type { SavedView } from './actions';

interface LeadRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  status: string;
  source: string;
  score: number | null;
  createdAt: string;
}

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  website: 'Website',
  google_ads: 'Google Ads',
  organic: 'Organic',
  referral: 'Referral',
  social: 'Social',
  email: 'Email',
  other: 'Other',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams({ limit: '50' });
  if (sp.status) params.set('status', sp.status);
  if (sp.source) params.set('source', sp.source);
  if (sp.q) params.set('q', sp.q);

  let leads: LeadRow[] = [];
  let loadError = false;
  try {
    const res = await apiServer<{ data: LeadRow[] }>(`/v1/leads?${params.toString()}`);
    leads = res.data;
  } catch {
    loadError = true;
  }

  let views: SavedView[] = [];
  try {
    views = await apiServer<SavedView[]>('/v1/org/saved-views?entity=leads');
  } catch {
    /* ignore */
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} {leads.length === 1 ? 'lead' : 'leads'} in your pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SavedViews current={sp} initialViews={views} />
          <Button
            nativeButton={false}
            render={<Link href="/leads/duplicates" />}
            variant="outline"
            size="sm"
          >
            <CopyCheck className="size-4" />
            Duplicates
          </Button>
          <ImportExportButtons entity="leads" />
          <NewLeadDialog />
        </div>
      </div>

      <div className="mb-2">
        <LeadsFilterBar status={sp.status ?? 'all'} source={sp.source ?? 'all'} q={sp.q ?? ''} />
      </div>

      {loadError ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load leads. Please refresh.
        </Card>
      ) : leads.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Users className="size-6" />
          </span>
          <div>
            <p className="font-medium">No leads found</p>
            <p className="text-sm text-muted-foreground">
              Try clearing filters, or create a new lead.
            </p>
          </div>
          <NewLeadDialog />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-secondary/40 transition-colors border-border/40">
                  <TableCell className="font-medium">
                    <DetailLink
                      href={`/leads/${lead.id}`}
                      tip="View lead"
                      className="hover:text-primary hover:underline"
                    >
                      {lead.name}
                    </DetailLink>
                    {lead.email && (
                      <span className="block text-xs text-muted-foreground">{lead.email}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.company ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {SOURCE_LABELS[lead.source] ?? lead.source}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{lead.score ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDate(lead.createdAt)}
                  </TableCell>
                  <TableCell>
                    <LeadRowActions id={lead.id} name={lead.name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
