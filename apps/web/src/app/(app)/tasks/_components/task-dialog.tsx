'use client';

import { useMemo, useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Member } from '@/lib/crm-actions';
import type { TaskFull } from '../actions';
import { isoDay } from './task-utils';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

interface ProjectRow {
  id: string;
  name: string;
}

export function TaskDialog({
  open,
  onOpenChange,
  editing,
  presetParent,
  projects,
  members,
  tasks,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: TaskFull | null;
  presetParent: string | null;
  projects: ProjectRow[];
  members: Member[];
  tasks: TaskFull[];
  onSubmit: (payload: {
    projectId: string;
    parentId?: string;
    title: string;
    priority: string;
    assigneeId?: string | null;
    startDate?: string | null;
    dueDate?: string | null;
    blockedBy?: string[];
    status?: string;
  }) => Promise<void>;
}) {
  const parentTask = presetParent ? tasks.find((t) => t.id === presetParent) ?? null : null;
  const [title, setTitle] = useState(editing?.title ?? '');
  const [projectId, setProjectId] = useState(
    editing?.projectId ?? parentTask?.projectId ?? projects[0]?.id ?? '',
  );
  const [priority, setPriority] = useState(editing?.priority ?? 'medium');
  const [status, setStatus] = useState(editing?.status ?? 'todo');
  const [assigneeId, setAssigneeId] = useState(editing?.assigneeId ?? '');
  const [startDate, setStartDate] = useState(editing?.startDate ? isoDay(editing.startDate) : '');
  const [dueDate, setDueDate] = useState(editing?.dueDate ? isoDay(editing.dueDate) : '');
  const [blockedBy, setBlockedBy] = useState<Set<string>>(new Set(editing?.blockedBy ?? []));
  const [saving, setSaving] = useState(false);

  // Candidate dependencies: other tasks in the same project.
  const depCandidates = useMemo(
    () => tasks.filter((t) => t.id !== editing?.id && t.projectId === projectId),
    [tasks, editing?.id, projectId],
  );

  function toggleDep(id: string) {
    setBlockedBy((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function submit() {
    if (!title.trim()) return;
    if (!editing && !projectId) return;
    if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
      return;
    }
    setSaving(true);
    await onSubmit({
      projectId,
      parentId: parentTask?.id,
      title: title.trim(),
      priority,
      assigneeId: assigneeId || null,
      startDate: startDate || null,
      dueDate: dueDate || null,
      blockedBy: Array.from(blockedBy),
      status: editing ? status : undefined,
    });
    setSaving(false);
  }

  const dateInvalid = !!(startDate && dueDate && new Date(startDate) > new Date(dueDate));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Edit task' : parentTask ? `New subtask · ${parentTask.title}` : 'New task'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus />
          </div>

          {!editing && !parentTask && (
            <div className="grid gap-2">
              <Label>Project</Label>
              <Select
                items={projects.map((p) => ({ value: p.id, label: p.name }))}
                value={projectId}
                onValueChange={(v) => setProjectId(v ?? '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select items={PRIORITIES.map((p) => ({ value: p, label: p }))} value={priority} onValueChange={(v) => setPriority(v ?? 'medium')}>
                <SelectTrigger className="w-full capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editing && (
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select items={STATUSES} value={status} onValueChange={(v) => setStatus((v as typeof status) ?? 'todo')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Assignee</Label>
            <Select
              items={[{ value: '', label: 'Unassigned' }, ...members.map((m) => ({ value: m.id, label: m.fullName }))]}
              value={assigneeId}
              onValueChange={(v) => setAssigneeId(v ?? '')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="task-start">Start date</Label>
              <Input id="task-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          {dateInvalid && <p className="text-xs text-rose-500">Start date must be on or before the due date.</p>}

          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5">
              <Link2 className="size-3.5" />
              Dependencies (blocked by)
            </Label>
            {depCandidates.length === 0 ? (
              <p className="text-xs text-muted-foreground">No other tasks in this project yet.</p>
            ) : (
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border/50 p-1">
                {depCandidates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleDep(t.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary/50"
                  >
                    <span
                      className={cn(
                        'grid size-4 shrink-0 place-items-center rounded border',
                        blockedBy.has(t.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                      )}
                    >
                      {blockedBy.has(t.id) && <Check className="size-3" />}
                    </span>
                    <span className="truncate">{t.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!title.trim() || dateInvalid || (!editing && !projectId)}>
            {editing ? 'Save changes' : 'Create task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
