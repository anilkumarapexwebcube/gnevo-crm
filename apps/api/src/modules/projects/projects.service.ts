import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateProjectRequest,
  CreateTaskRequest,
  ListProjectsQuery,
  UpdateProjectRequest,
  UpdateTaskRequest,
} from '@gnevo/types';
import { PrismaService } from '../../prisma/prisma.service.js';
import { orgChat } from '../../common/ai.helper.js';
import { AutomationEngineService } from '../automations/automation-engine.service.js';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: AutomationEngineService,
  ) {}

  async list(organizationId: string, query: ListProjectsQuery) {
    const db = this.prisma.forTenant(organizationId);
    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}),
    };
    const rows = await db.project.findMany({
      where,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'desc' },
      include: { _count: { select: { tasks: { where: { deletedAt: null } } } } },
    });
    const hasMore = rows.length > query.limit;
    const data = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      data: data.map((p) => ({ ...p, taskCount: p._count.tasks })),
      pagination: {
        nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
        hasMore,
        limit: query.limit,
      },
    };
  }

  async get(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const project = await db.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        tasks: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(organizationId: string, dto: CreateProjectRequest) {
    const db = this.prisma.forTenant(organizationId);
    return db.project.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description ?? null,
        customerId: dto.customerId ?? null,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateProjectRequest) {
    await this.get(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    return db.project.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    await this.get(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    await db.project.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }

  // ── Tasks ──

  async listAllTasks(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.task.findMany({
      where: { deletedAt: null },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, fullName: true } },
      },
    });
  }

  async createTask(organizationId: string, dto: CreateTaskRequest) {
    await this.get(organizationId, dto.projectId);
    const db = this.prisma.forTenant(organizationId);
    return db.task.create({
      data: {
        organizationId,
        projectId: dto.projectId,
        parentId: dto.parentId ?? null,
        title: dto.title,
        priority: dto.priority,
        assigneeId: dto.assigneeId ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        blockedBy: dto.blockedBy ?? [],
      },
    });
  }

  async updateTask(organizationId: string, id: string, dto: UpdateTaskRequest) {
    const db = this.prisma.forTenant(organizationId);
    const task = await db.task.findFirst({ where: { id, deletedAt: null } });
    if (!task) throw new NotFoundException('Task not found');

    // Guard against depending on itself.
    const blockedBy = dto.blockedBy?.filter((b) => b !== id);

    const updated = await db.task.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
        ...(blockedBy !== undefined ? { blockedBy } : {}),
        ...(dto.startDate === undefined
          ? {}
          : { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.dueDate === undefined
          ? {}
          : { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
      },
    });
    if (dto.status === 'done' && task.status !== 'done') {
      await this.engine.trigger(organizationId, 'task.completed', {
        taskId: updated.id,
        name: updated.title,
        title: updated.title,
        status: 'done',
        assigneeId: updated.assigneeId,
        ownerId: updated.assigneeId,
        projectId: updated.projectId,
      });
    }
    return updated;
  }

  /** AI summary of a project's task board — progress, blockers, what's next. */
  async summarizeTasks(organizationId: string, projectId: string): Promise<{ summary: string }> {
    const db = this.prisma.forTenant(organizationId);
    const project = await db.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        tasks: {
          where: { deletedAt: null },
          select: { title: true, status: true, priority: true, dueDate: true, blockedBy: true },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    const counts = { todo: 0, in_progress: 0, done: 0 } as Record<string, number>;
    for (const t of project.tasks) counts[t.status] = (counts[t.status] ?? 0) + 1;
    const now = new Date();
    const overdue = project.tasks.filter(
      (t) => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now,
    );
    const blocked = project.tasks.filter((t) => t.blockedBy.length > 0 && t.status !== 'done');

    const lines = project.tasks
      .slice(0, 60)
      .map((t) => `- [${t.status}] (${t.priority}) ${t.title}${t.dueDate ? ` — due ${new Date(t.dueDate).toDateString()}` : ''}`)
      .join('\n');
    const facts =
      `Project: ${project.name}\n` +
      `Totals: ${project.tasks.length} tasks — ${counts.todo ?? 0} to-do, ${counts.in_progress ?? 0} in progress, ${counts.done ?? 0} done.\n` +
      `Overdue: ${overdue.length}. Blocked: ${blocked.length}.\n\nTasks:\n${lines}`;
    const prompt =
      `You are a delivery manager. Summarize this project's task board in under 120 words: overall progress, ` +
      `key risks (overdue/blocked), and the top 3 things to focus on next. Plain text, no markdown headers.\n\n${facts}`;

    const summary = (await orgChat(this.prisma, organizationId, [{ role: 'user', content: prompt }])).trim();
    await db.project.update({ where: { id: projectId }, data: { aiSummary: summary } });
    return { summary };
  }

  async removeTask(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const task = await db.task.findFirst({ where: { id, deletedAt: null } });
    if (!task) throw new NotFoundException('Task not found');
    await db.task.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }
}
