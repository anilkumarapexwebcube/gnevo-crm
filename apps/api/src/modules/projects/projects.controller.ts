import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreateProjectRequestSchema,
  CreateTaskRequestSchema,
  ListProjectsQuerySchema,
  UpdateProjectRequestSchema,
  UpdateTaskRequestSchema,
  type AuthUser,
  type CreateProjectRequest,
  type CreateTaskRequest,
  type ListProjectsQuery,
  type UpdateProjectRequest,
  type UpdateTaskRequest,
} from '@gnevo/types';
import { ProjectsService } from './projects.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @RequirePermissions({ resource: 'project', action: 'view' })
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(ListProjectsQuerySchema)) query: ListProjectsQuery,
  ) {
    return this.projects.list(user.organizationId, query);
  }

  @Get('tasks/all')
  @RequirePermissions({ resource: 'task', action: 'view' })
  allTasks(@CurrentUser() user: AuthUser) {
    return this.projects.listAllTasks(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions({ resource: 'project', action: 'view' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.get(user.organizationId, id);
  }

  @Post()
  @RequirePermissions({ resource: 'project', action: 'create' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateProjectRequestSchema)) dto: CreateProjectRequest,
  ) {
    return this.projects.create(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions({ resource: 'project', action: 'update' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProjectRequestSchema)) dto: UpdateProjectRequest,
  ) {
    return this.projects.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'project', action: 'delete' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.remove(user.organizationId, id);
  }

  @Post(':id/summary')
  @RequirePermissions({ resource: 'ai', action: 'create' })
  summarizeTasks(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.summarizeTasks(user.organizationId, id);
  }

  // ── Tasks ──

  @Post('tasks')
  @RequirePermissions({ resource: 'task', action: 'create' })
  createTask(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateTaskRequestSchema)) dto: CreateTaskRequest,
  ) {
    return this.projects.createTask(user.organizationId, dto);
  }

  @Patch('tasks/:taskId')
  @RequirePermissions({ resource: 'task', action: 'update' })
  updateTask(
    @CurrentUser() user: AuthUser,
    @Param('taskId') taskId: string,
    @Body(new ZodValidationPipe(UpdateTaskRequestSchema)) dto: UpdateTaskRequest,
  ) {
    return this.projects.updateTask(user.organizationId, taskId, dto);
  }

  @Delete('tasks/:taskId')
  @RequirePermissions({ resource: 'task', action: 'delete' })
  removeTask(@CurrentUser() user: AuthUser, @Param('taskId') taskId: string) {
    return this.projects.removeTask(user.organizationId, taskId);
  }
}
