import { Search, Globe, TrendingUp } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { DetailLink } from '@/components/detail-link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewSeoProjectDialog } from './_components/new-seo-project-dialog';
import { SeoProjectRowActions } from './_components/seo-project-row-actions';

interface SeoProjectRow {
  id: string;
  name: string;
  siteUrl: string;
  gscConnected: boolean;
  _count: { keywords: number };
}

export default async function SeoPage() {
  let projects: SeoProjectRow[] = [];
  let loadError = false;
  try {
    projects = await apiServer<SeoProjectRow[]>('/v1/seo/projects');
  } catch {
    loadError = true;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SEO</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <NewSeoProjectDialog />
      </div>

      {loadError ? (
        <Card className="p-8 text-center text-sm text-muted-foreground rounded-2xl border-0 ring-1 ring-border/50">
          Couldn&apos;t load SEO projects. Please refresh.
        </Card>
      ) : projects.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 p-16 text-center rounded-2xl border-0 ring-1 ring-border/50 bg-gradient-to-b from-card to-card/50 shadow-sm">
          <div className="relative">
            <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
              <Search className="size-8" />
            </div>
            <div className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              0
            </div>
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground">No SEO projects yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add a site to track keywords &amp; rankings.
            </p>
          </div>
          <div className="mt-2">
            <NewSeoProjectDialog />
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="group relative overflow-hidden flex flex-col gap-0 p-0 rounded-2xl shadow-sm border-0 ring-1 ring-border/50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:ring-primary/30 bg-gradient-to-br from-card to-card/50"
            >
              {/* Colored top accent */}
              <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-purple-500/40 to-blue-500/40 group-hover:from-primary group-hover:via-purple-500/70 group-hover:to-blue-500/60 transition-all duration-500" />

              <div className="flex flex-col gap-3 p-5">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <Search className="size-4" />
                    </div>
                    <DetailLink href={`/seo/${p.id}`} tip="Open SEO project">
                      <span className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">{p.name}</span>
                    </DetailLink>
                  </div>
                  <SeoProjectRowActions id={p.id} name={p.name} />
                </div>

                {/* URL */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <Globe className="size-3 shrink-0 text-muted-foreground/60" />
                  <p className="truncate text-xs text-muted-foreground">{p.siteUrl}</p>
                </div>

                {/* Footer stats */}
                <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-1">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-primary/70" />
                    <span className="text-xs font-medium text-foreground/80">
                      {p._count.keywords} {p._count.keywords === 1 ? 'keyword' : 'keywords'}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`rounded-full text-[11px] font-semibold px-2.5 ${
                      p.gscConnected
                        ? 'text-green-600 border-green-500/30 bg-green-500/10'
                        : 'text-muted-foreground border-border/50 bg-muted/30'
                    }`}
                  >
                    {p.gscConnected ? '✓ GSC connected' : 'Not connected'}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
