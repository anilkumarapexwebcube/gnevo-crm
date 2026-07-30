import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@gnevo/types';
import { NotificationsService } from './notifications.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user.organizationId, user.id);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.organizationId, user.id);
  }

  @Post(':id/read')
  @HttpCode(200)
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.organizationId, user.id, id);
  }

  @Post('read-all')
  @HttpCode(200)
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.organizationId, user.id);
  }
}
