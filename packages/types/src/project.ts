import { z } from 'zod';
import { IdSchema, PaginationQuerySchema, TimestampsSchema } from './common.js';

export const ProjectStatusSchema = z.enum(['active', 'on_hold', 'completed', 'archived']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectSchema = z
  .object({
    id: IdSchema,
    organizationId: IdSchema,
    customerId: IdSchema.nullable(),
    name: z.string().min(1).max(160),
    description: z.string().max(2000).nullable(),
    status: ProjectStatusSchema,
    ownerId: IdSchema.nullable(),
  })
  .merge(TimestampsSchema);
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  customerId: IdSchema.optional(),
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const UpdateProjectRequestSchema = CreateProjectRequestSchema.partial().extend({
  status: ProjectStatusSchema.optional(),
});
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;

export const ListProjectsQuerySchema = PaginationQuerySchema.extend({
  status: ProjectStatusSchema.optional(),
  q: z.string().max(160).optional(),
});
export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>;

// ── Tasks ──

export const TaskStatusSchema = z.enum(['todo', 'in_progress', 'done']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskSchema = z
  .object({
    id: IdSchema,
    organizationId: IdSchema,
    projectId: IdSchema.nullable(),
    parentId: IdSchema.nullable(),
    title: z.string().min(1).max(240),
    status: TaskStatusSchema,
    priority: TaskPrioritySchema,
    assigneeId: IdSchema.nullable(),
    startDate: z.string().nullable(),
    dueDate: z.string().nullable(),
    blockedBy: z.array(IdSchema),
  })
  .merge(TimestampsSchema);
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskRequestSchema = z.object({
  projectId: IdSchema,
  parentId: IdSchema.optional(),
  title: z.string().min(1).max(240),
  priority: TaskPrioritySchema.default('medium'),
  assigneeId: IdSchema.optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  blockedBy: z.array(IdSchema).optional(),
});
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;

export const UpdateTaskRequestSchema = z.object({
  title: z.string().min(1).max(240).optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assigneeId: IdSchema.nullable().optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  blockedBy: z.array(IdSchema).optional(),
});
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;
