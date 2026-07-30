'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { summarizeProject } from '../../actions';

export function ProjectSummary({ projectId, initial }: { projectId: string; initial: string | null }) {
  const [summary, setSummary] = useState<string | null>(initial);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const res = await summarizeProject(projectId);
    setLoading(false);
    if (res.ok) {
      setSummary(res.summary ?? null);
      toast.success('AI summary ready');
    } else toast.error(res.error ?? 'Failed');
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 to-purple-500/5 p-4 ring-1 ring-primary/10">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Sparkles className="size-4" />
          AI task summary
        </h2>
        <Button size="xs" variant={summary ? 'outline' : 'default'} onClick={run} loading={loading}>
          {!loading && (summary ? <RefreshCw className="size-3" /> : <Sparkles className="size-3" />)}
          {summary ? 'Regenerate' : 'Generate'}
        </Button>
      </div>
      {summary ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{summary}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Generate an AI overview of progress, risks, and what to focus on next.</p>
      )}
    </div>
  );
}
