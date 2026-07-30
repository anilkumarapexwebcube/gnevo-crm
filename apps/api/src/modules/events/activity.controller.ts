import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@gnevo/types';
import { ActivityService } from './activity.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('activity')
@Controller('activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activity.list(user.organizationId, {
      entityType,
      entityId,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
