import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreateAnnouncementRequestSchema,
  type AuthUser,
  type CreateAnnouncementRequest,
} from '@gnevo/types';
import { SupportService } from './support.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@ApiTags('announcements')
@ApiBearerAuth()
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly support: SupportService) {}

  @Get()
  @RequirePermissions({ resource: 'announcement', action: 'view' })
  list(@CurrentUser() user: AuthUser) {
    return this.support.listAnnouncements(user.organizationId);
  }

  @Post()
  @RequirePermissions({ resource: 'announcement', action: 'create' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateAnnouncementRequestSchema)) dto: CreateAnnouncementRequest,
  ) {
    return this.support.createAnnouncement(user.organizationId, user.id, dto);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'announcement', action: 'delete' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.support.removeAnnouncement(user.organizationId, id);
  }
}
