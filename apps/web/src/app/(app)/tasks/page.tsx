import { apiServer } from '@/lib/session';
import { getMembers, type Member } from '@/lib/crm-actions';
import { TasksWorkspace } from './_components/tasks-workspace';
import type { TaskFull } from './actions';

export const dynamic = 'force-dynamic';

interface ProjectRow {
  id: string;
  name: string;
}

export default async function TasksPage() {
  let tasks: TaskFull[] = [];
  let projects: ProjectRow[] = [];
  let members: Member[] = [];
  let loadError = false;
  try {
    const [t, p, m] = await Promise.all([
      apiServer<TaskFull[]>('/v1/projects/tasks/all'),
      apiServer<{ data: ProjectRow[] }>('/v1/projects?limit=100'),
      getMembers(),
    ]);
    tasks = t;
    projects = p.data;
    members = m;
  } catch {
    loadError = true;
  }

  return (
    <TasksWorkspace
      initialTasks={tasks}
      projects={projects}
      members={members}
      loadError={loadError}
    />
  );
}
