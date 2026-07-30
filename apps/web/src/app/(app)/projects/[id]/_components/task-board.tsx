'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useRouter } from 'next/navigation';
import { Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { deleteTask, updateTaskStatus } from '../../actions';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
}

const COLUMNS = [
  { key: 'todo', label: 'To do', icon: Circle, color: 'text-muted-foreground' },
  { key: 'in_progress', label: 'In progress', icon: Clock, color: 'text-blue-500' },
  { key: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-500' },
];

const STATUS_ITEMS = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_STYLES: Record<string, string> = {
  low: 'text-foreground/70 border-foreground/20 bg-foreground/5',
  medium: 'text-info border-info/30 bg-info/10',
  high: 'text-warning border-warning/30 bg-warning/10',
  urgent: 'text-danger border-danger/30 bg-danger/10',
};

function TaskCard({
  task,
  projectId,
}: {
  task: Task;
  projectId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // dnd-kit draggable
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  function setStatus(status: string) {
    startTransition(async () => {
      const res = await updateTaskStatus(task.id, projectId, status);
      if (res.ok) router.refresh();
      else toast.error(res.error ?? 'Failed to update task');
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/task relative flex flex-col gap-3 rounded-xl border-0 bg-card p-4 shadow-sm ring-1 ring-border/50 ${
        isDragging
          ? 'opacity-50 shadow-xl ring-primary/60'
          : 'transition-shadow transition-[box-shadow,--tw-ring-color] duration-200 hover:shadow-md hover:ring-primary/40'
      }`}
    >
      {/* Drag handle area — uses dnd-kit listeners */}
      <div
        {...listeners}
        {...attributes}
        className="flex items-start justify-between gap-2 cursor-grab active:cursor-grabbing"
      >
        <p className="text-sm font-semibold text-foreground leading-snug select-none">
          {task.title}
        </p>
        <ConfirmationDialog
          trigger={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Delete ${task.title}`}
              // Stop the drag from firing when clicking the delete button
              onPointerDown={(e) => e.stopPropagation()}
              className="opacity-0 transition-opacity group-hover/task:opacity-100 hover:bg-destructive/10 hover:text-destructive -mr-1 -mt-1 h-6 w-6 shrink-0"
            >
              <Trash2 className="size-3.5" />
            </Button>
          }
          icon={<Trash2 />}
          title="Delete task?"
          description={`"${task.title}" will be removed forever.`}
          confirmText="Delete Task"
          variant="destructive"
          loading={pending}
          onConfirm={() =>
            startTransition(async () => {
              const res = await deleteTask(task.id, projectId);
              if (res.ok) {
                toast.success('Task deleted');
                router.refresh();
              } else {
                toast.error(res.error ?? 'Failed to delete task');
              }
            })
          }
        />
      </div>

      {/* Priority badge + status select (not draggable, pointer events only) */}
      <div
        className="flex items-center justify-between gap-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Badge
          variant="outline"
          className={`rounded-full shadow-sm text-[10px] font-semibold px-2 ${PRIORITY_STYLES[task.priority] ?? ''}`}
        >
          {task.priority}
        </Badge>
        <Select
          items={STATUS_ITEMS}
          value={task.status}
          onValueChange={(v) => setStatus(v ?? task.status)}
        >
          <SelectTrigger
            size="sm"
            className="h-7 w-[110px] text-xs font-medium rounded-md border-border/50 bg-background/50 hover:bg-background transition-colors focus:ring-1 focus:ring-primary/50"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/50 shadow-lg">
            {STATUS_ITEMS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs font-medium rounded-lg cursor-pointer">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function KanbanColumn({
  col,
  tasks,
  projectId,
}: {
  col: (typeof COLUMNS)[number];
  tasks: Task[];
  projectId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <col.icon className={`size-4 ${col.color}`} />
          <span className="text-sm font-bold text-foreground">{col.label}</span>
        </div>
        <Badge
          variant="secondary"
          className="grid min-w-6 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold px-2 shadow-none border border-primary/20"
        >
          {tasks.length}
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[160px] flex-col gap-3 rounded-2xl p-2 border border-dashed transition-colors duration-200 ${
          isOver
            ? 'border-primary bg-primary/5'
            : 'border-border/40 bg-muted/20 hover:bg-muted/30'
        }`}
      >
        {tasks.length === 0 ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 opacity-60 py-8">
            <div className="grid size-10 place-items-center rounded-full bg-background border border-border/50 border-dashed text-muted-foreground/50">
              <col.icon className="size-4" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Drop tasks here</p>
          </div>
        ) : (
          tasks.map((t) => <TaskCard key={t.id} task={t} projectId={projectId} />)
        )}
      </div>
    </div>
  );
}

export function TaskBoard({
  tasks: initialTasks,
  projectId,
}: {
  tasks: Task[];
  projectId: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Re-sync when server sends fresh data after revalidation
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  function onDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const toStatus = event.over ? String(event.over.id) : null;
    if (!toStatus) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === toStatus) return;

    // Optimistic update — move task to the new column immediately
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: toStatus } : t)),
    );

    void updateTaskStatus(taskId, projectId, toStatus).then((res) => {
      if (!res.ok) {
        toast.error(res.error ?? 'Failed to move task');
        setTasks(initialTasks); // revert
      } else {
        router.refresh();
      }
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid gap-6 md:grid-cols-3 items-start">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <KanbanColumn
              key={col.key}
              col={col}
              tasks={colTasks}
              projectId={projectId}
            />
          );
        })}
      </div>
    </DndContext>
  );
}
