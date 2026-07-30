import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '../_components/status-badge';
import { LeadScoreButton } from './_components/lead-score-button';
import { ConvertLeadButton } from './_components/convert-lead-button';
import { NotesTimeline } from '@/components/notes-timeline';
import { TagEditor } from '@/components/tag-editor';

interface Lead {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  source: string;
  score: number | null;
  tags: string[] | null;
  createdAt: string;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-border/40 py-3.5 last:border-0 transition-colors">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value ?? '—'}</dd>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let lead: Lead;
  try {
    lead = await apiServer<Lead>(`/v1/leads/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
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

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
          <StatusBadge status={lead.status} />
        </div>
        <div className="flex items-center gap-2">
          <ConvertLeadButton id={lead.id} status={lead.status} />
          <LeadScoreButton id={lead.id} />
        </div>
      </div>

      <TagEditor entityType="lead" entityId={lead.id} initialTags={lead.tags ?? []} />

      <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
        <dl>
          <Row label="Company" value={lead.company} />
          <Row label="Email" value={lead.email} />
          <Row label="Phone" value={lead.phone} />
          <Row label="Source" value={lead.source} />
          <Row label="Score" value={lead.score ?? '—'} />
          <Row
            label="Created"
            value={new Date(lead.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          />
        </dl>
      </Card>

      <Card className="p-6 rounded-2xl shadow-sm border-0 ring-1 ring-border/50">
        <NotesTimeline entityType="lead" entityId={lead.id} />
      </Card>
    </div>
  );
}
