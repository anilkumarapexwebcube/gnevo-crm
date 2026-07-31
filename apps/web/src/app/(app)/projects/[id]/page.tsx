import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { apiServer } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TaskBoard } from './_components/task-board';
import { NewTaskDialog } from './_components/new-task-dialog';
import { Attachments } from '@/components/attachments';
import { TimeLog } from '@/components/time-log';
import { MilestonesPanel } from '@/components/milestones-panel';
import { ProjectSummary } from './_components/project-summary';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
}
interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  aiSummary: string | null;
  tasks: Task[];
}

const STATUS_STYLES: Record<string, string> = {
  active: 'text-success border-success/30 bg-success/10',
  on_hold: 'text-warning border-warning/30 bg-warning/10',
  completed: 'text-info border-info/30 bg-info/10',
  archived: 'text-foreground/70 border-foreground/20 bg-foreground/5',
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let project: Project;
  try {
    project = await apiServer<Project>(`/v1/projects/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Back button */}
      <Button
        nativeButton={false}
        render={<Link href="/projects" />}
        variant="ghost"
        size="sm"
        className="w-fit rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to projects
      </Button>

      {/* Project Header */}
      <Card className="relative overflow-hidden p-0 rounded-2xl border-0 ring-1 ring-border/50 shadow-sm bg-gradient-to-br from-card to-card/50">
        <div className="h-1 w-full bg-linear-to-r from-primary via-purple-500/60 to-blue-500/50" />
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Briefcase className="size-5" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{project.name}</h1>
              <Badge variant="outline" className={`rounded-full shadow-sm font-semibold px-3 ${STATUS_STYLES[project.status] ?? ''}`}>
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
            {project.description ? (
              <p className="text-base text-muted-foreground/90 max-w-3xl leading-relaxed">
                {project.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/50 italic">No description provided.</p>
            )}
          </div>
          <div className="shrink-0">
            <NewTaskDialog projectId={project.id} />
          </div>
        </div>
      </Card>

      {/* Kanban Board */}
      <ProjectSummary projectId={project.id} initial={project.aiSummary} />

      <TaskBoard tasks={project.tasks} projectId={project.id} />

      <Card className="p-6">
        <MilestonesPanel projectId={project.id} />
      </Card>

      <Card className="p-6">
        <TimeLog projectId={project.id} />
      </Card>

      <Card className="p-6">
        <Attachments entityType="project" entityId={project.id} />
      </Card>
    </div>
  );
}
