import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { MilestonesService } from './milestones.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const CreateMilestoneSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(160),
  dueDate: z.string().optional(),
});

@ApiTags('milestones')
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) {}

  @Get()
  @RequirePermissions({ resource: 'project', action: 'view' })
  list(@CurrentUser() user: AuthUser, @Query('projectId') projectId: string) {
    return this.milestones.list(user.organizationId, projectId);
  }

  @Post()
  @RequirePermissions({ resource: 'project', action: 'update' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateMilestoneSchema))
    dto: { projectId: string; title: string; dueDate?: string },
  ) {
    return this.milestones.create(user.organizationId, dto);
  }

  @Post(':id/toggle')
  @RequirePermissions({ resource: 'project', action: 'update' })
  toggle(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.milestones.toggle(user.organizationId, id);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'project', action: 'update' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.milestones.remove(user.organizationId, id);
  }
}
