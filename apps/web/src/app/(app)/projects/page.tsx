import { FolderKanban, Briefcase, FileText } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { DetailLink } from '@/components/detail-link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewProjectDialog } from './_components/new-project-dialog';
import { ProjectRowActions } from './_components/project-row-actions';

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  taskCount: number;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'text-success border-success/30 bg-success/10',
  on_hold: 'text-warning border-warning/30 bg-warning/10',
  completed: 'text-info border-info/30 bg-info/10',
  archived: 'text-foreground/70 border-foreground/20 bg-foreground/5',
};

export default async function ProjectsPage() {
  let projects: ProjectRow[] = [];
  let loadError = false;
  try {
    const res = await apiServer<{ data: ProjectRow[] }>('/v1/projects?limit=50');
    projects = res.data;
  } catch {
    loadError = true;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <NewProjectDialog />
      </div>

      {loadError ? (
        <Card className="p-8 text-center text-sm text-muted-foreground rounded-2xl border-0 ring-1 ring-border/50">
          Couldn&apos;t load projects. Please refresh.
        </Card>
      ) : projects.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 p-16 text-center rounded-2xl border-0 ring-1 ring-border/50 bg-gradient-to-b from-card to-card/50 shadow-sm">
          <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
            <FolderKanban className="size-8" />
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground">No projects yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a project to start tracking delivery work.
            </p>
          </div>
          <div className="mt-2">
            <NewProjectDialog />
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
              <div className="h-1 w-full bg-linear-to-r from-primary/60 via-purple-500/40 to-blue-500/40 group-hover:from-primary group-hover:via-purple-500/70 group-hover:to-blue-500/60 transition-all duration-500" />

              <div className="flex flex-col gap-3 p-5 h-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <Briefcase className="size-4" />
                    </div>
                    <DetailLink href={`/projects/${p.id}`} tip="Open project">
                      <span className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">{p.name}</span>
                    </DetailLink>
                  </div>
                  <ProjectRowActions id={p.id} name={p.name} />
                </div>

                {p.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground min-h-[40px]">{p.description}</p>
                ) : (
                  <p className="line-clamp-2 text-sm text-muted-foreground/50 min-h-[40px] italic">No description provided.</p>
                )}

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/40">
                  <Badge variant="outline" className={`rounded-full shadow-sm text-[11px] font-semibold px-2.5 ${STATUS_STYLES[p.status] ?? ''}`}>
                    {p.status.replace('_', ' ')}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <FileText className="size-3.5 text-primary/70" />
                    <span className="text-xs font-medium text-foreground/80">
                      {p.taskCount} {p.taskCount === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
