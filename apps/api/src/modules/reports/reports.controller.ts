import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@gnevo/types';
import { ReportsService } from './reports.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('overview')
  @RequirePermissions({ resource: 'report', action: 'view' })
  overview(@CurrentUser() user: AuthUser) {
    return this.reports.overview(user.organizationId);
  }

  @Get('ar')
  @RequirePermissions({ resource: 'report', action: 'view' })
  ar(@CurrentUser() user: AuthUser) {
    return this.reports.arReport(user.organizationId);
  }

  @Get('bi')
  @RequirePermissions({ resource: 'report', action: 'view' })
  bi(@CurrentUser() user: AuthUser) {
    return this.reports.bi(user.organizationId);
  }

  @Get('custom')
  @RequirePermissions({ resource: 'report', action: 'view' })
  custom(
    @CurrentUser() user: AuthUser,
    @Query('source') source = 'leads',
    @Query('groupBy') groupBy = 'status',
    @Query('metric') metric = 'count',
  ) {
    return this.reports.custom(user.organizationId, { source, groupBy, metric });
  }
}
