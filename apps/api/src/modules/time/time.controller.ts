import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { TimeService } from './time.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const LogTimeSchema = z.object({
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  minutes: z.coerce.number().int().min(1).max(100000),
  note: z.string().max(500).optional(),
  spentAt: z.string().optional(),
});

@ApiTags('time')
@Controller('time')
export class TimeController {
  constructor(private readonly time: TimeService) {}

  @Post()
  log(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(LogTimeSchema))
    dto: { projectId?: string; taskId?: string; minutes: number; note?: string; spentAt?: string },
  ) {
    return this.time.log(user.organizationId, { id: user.id, name: user.fullName }, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('projectId') projectId?: string) {
    return this.time.list(user.organizationId, projectId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.time.remove(user.organizationId, id);
  }
}
