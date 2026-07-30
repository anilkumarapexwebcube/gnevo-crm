'use client';

import { useState, useTransition } from 'react';
import { Gauge, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { runAudit, type AuditReport } from '../../actions';

export function AuditPanel({ siteUrl }: { siteUrl: string }) {
  const [url, setUrl] = useState(siteUrl ?? '');
  const [report, setReport] = useState<AuditReport | null>(null);
  const [pending, startTransition] = useTransition();

  function run(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    startTransition(async () => {
      const res = await runAudit(url.trim());
      if (res.ok && res.report) setReport(res.report);
      else toast.error(res.error ?? 'Audit failed');
    });
  }

  const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="rounded-lg bg-secondary/30 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );

  return (
    <Card className="p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Gauge className="size-4 text-muted-foreground" />
        On-page audit
      </h2>

      <form onSubmit={run} className="mb-4 flex items-end gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/page" className="h-9 flex-1" />
        <Button type="submit" size="sm" loading={pending}>
          {!pending && <Search className="size-4" />}
          Run audit
        </Button>
      </form>

      {report && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Stat label="HTTP status" value={report.status} />
            <Stat label="Title length" value={`${report.titleLength} chars`} />
            <Stat label="Meta desc" value={`${report.metaDescriptionLength} chars`} />
            <Stat label="H1 tags" value={report.h1s.length} />
            <Stat label="Words" value={report.wordCount} />
            <Stat label="Images (no alt)" value={`${report.imageCount} (${report.imagesMissingAlt})`} />
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-border/50 p-3 text-sm">
            <p><span className="text-muted-foreground">Title:</span> {report.title || '—'}</p>
            <p className="truncate"><span className="text-muted-foreground">Meta:</span> {report.metaDescription || '—'}</p>
            <p className="truncate"><span className="text-muted-foreground">Canonical:</span> {report.canonical || '—'}</p>
            {report.robots && <p><span className="text-muted-foreground">Robots:</span> {report.robots}</p>}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Issues {report.issues.length === 0 ? '' : `(${report.issues.length})`}
            </p>
            {report.issues.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="size-4" />
                No major on-page issues found.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {report.issues.map((i, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                    {i}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
