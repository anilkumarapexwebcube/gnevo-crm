import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Globe, TrendingUp, MousePointerClick, Eye, Hash } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AddKeywordDialog } from './_components/add-keyword-dialog';
import { KeywordRowActions } from './_components/keyword-row-actions';
import { GscActions } from './_components/gsc-actions';
import { SnapshotButton } from './_components/snapshot-button';
import { KeywordHistoryDialog } from './_components/keyword-history-dialog';
import { AuditPanel } from './_components/audit-panel';
import { CompetitorsPanel } from './_components/competitors-panel';

interface Keyword {
  id: string;
  term: string;
  position: number | null;
  clicks: number;
  impressions: number;
}
interface SeoProject {
  id: string;
  name: string;
  siteUrl: string;
  gscConnected: boolean;
  keywords: Keyword[];
}

export default async function SeoProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let project: SeoProject;
  try {
    project = await apiServer<SeoProject>(`/v1/seo/projects/${id}`);
  } catch {
    notFound();
  }

  const totalClicks = project.keywords.reduce((s, k) => s + k.clicks, 0);
  const totalImpressions = project.keywords.reduce((s, k) => s + k.impressions, 0);
  const avgPosition =
    project.keywords.filter((k) => k.position != null).length > 0
      ? (
        project.keywords.reduce((s, k) => s + (k.position ?? 0), 0) /
        project.keywords.filter((k) => k.position != null).length
      ).toFixed(1)
      : '—';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Back button */}
      <Button
        nativeButton={false}
        render={<Link href="/seo" />}
        variant="ghost"
        size="sm"
        className="w-fit rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to SEO
      </Button>

      {/* Project Header */}
      <Card className="relative overflow-hidden p-0 rounded-2xl border-0 ring-1 ring-border/50 shadow-sm bg-gradient-to-br from-card to-card/50">
        <div className="h-1 w-full bg-linear-to-r from-primary via-purple-500/60 to-blue-500/50" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{project.name}</h1>
            <a
              href={project.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Globe className="size-3.5" />
              {project.siteUrl}
            </a>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <GscActions id={project.id} connected={project.gscConnected} />
            <SnapshotButton projectId={project.id} />
            <AddKeywordDialog seoProjectId={project.id} />
          </div>
        </div>
      </Card>

      {/* GSC Status Banner */}
      <div
        className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 ring-1 transition-colors ${project.gscConnected
            ? 'bg-green-500/5 ring-green-500/20 text-green-700 dark:text-green-400'
            : 'bg-muted/40 ring-border/40 text-muted-foreground'
          }`}
      >
        <Badge
          variant="outline"
          className={`shrink-0 rounded-full font-semibold text-xs ${project.gscConnected
              ? 'border-green-500/30 bg-green-500/10 text-green-600'
              : 'border-border/50 bg-muted/30 text-muted-foreground'
            }`}
        >
          {project.gscConnected ? '✓ GSC connected' : 'Not connected'}
        </Badge>
        <span className="text-sm">
          {project.gscConnected
            ? 'Click "Sync from GSC" to pull the latest clicks, impressions & positions.'
            : 'Connect Google Search Console to auto-import real keyword data, or add keywords manually.'}
        </span>
      </div>

      {/* KPI Stats */}
      {project.keywords.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Clicks', value: String(totalClicks), icon: MousePointerClick, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Impressions', value: String(totalImpressions), icon: Eye, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { label: 'Avg. Position', value: String(avgPosition), icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="group relative overflow-hidden flex flex-col gap-2 p-5 rounded-2xl border-0 ring-1 ring-border/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:ring-primary/20 transition-all duration-300 bg-gradient-to-br from-card to-card/50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className={`grid size-8 place-items-center rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon className="size-4" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{stat.label}</p>
              <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground group-hover:text-primary transition-colors">{stat.value}</span>
            </Card>
          ))}
        </div>
      )}

      {/* Keywords Table */}
      {project.keywords.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 p-14 text-center rounded-2xl border-0 ring-1 ring-border/50 bg-gradient-to-b from-card to-card/50 shadow-sm">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
            <Hash className="size-7" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">No keywords yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add one to start tracking rankings.</p>
          </div>
          <div className="mt-1">
            <AddKeywordDialog seoProjectId={project.id} />
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 rounded-2xl border-0 ring-1 ring-border/50 shadow-sm bg-gradient-to-b from-card to-card/50">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="grid size-6 place-items-center rounded-md bg-primary/10 text-primary">
                <Hash className="size-3.5" />
              </div>
              <p className="text-sm font-semibold text-foreground">Keywords</p>
              <Badge className="rounded-full bg-primary/10 text-primary border-0 text-xs font-semibold">
                {project.keywords.length}
              </Badge>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20 border-border/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">Keyword</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">Position</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">Clicks</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">Impressions</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.keywords.map((k) => (
                <TableRow key={k.id} className="hover:bg-primary/5 transition-colors duration-200 border-border/30">
                  <TableCell className="font-semibold text-foreground py-4">
                    <div className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary/40" />
                      {k.term}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {k.position != null ? (
                      <Badge
                        variant="outline"
                        className={`ml-auto rounded-full font-semibold text-xs ${k.position <= 3
                            ? 'text-green-600 border-green-500/30 bg-green-500/10'
                            : k.position <= 10
                              ? 'text-yellow-600 border-yellow-500/30 bg-yellow-500/10'
                              : 'text-muted-foreground border-border/50 bg-muted/30'
                          }`}
                      >
                        #{k.position}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-foreground/80">{k.clicks}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-foreground/80">{k.impressions}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <KeywordHistoryDialog id={k.id} term={k.term} />
                      <KeywordRowActions id={k.id} seoProjectId={project.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AuditPanel siteUrl={project.siteUrl} />
      <CompetitorsPanel projectId={project.id} />
    </div>
  );
}
