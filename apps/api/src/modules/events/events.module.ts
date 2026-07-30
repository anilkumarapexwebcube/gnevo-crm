import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { ActivityService } from './activity.service.js';
import { AuditService } from './audit.service.js';
import { NotificationsController } from './notifications.controller.js';
import { ActivityController } from './activity.controller.js';
import { AuditController } from './audit.controller.js';

/**
 * Global events module: any service can inject NotificationsService,
 * ActivityService or AuditService to record in-app notifications,
 * activity-timeline entries, or immutable audit records — without importing
 * this module.
 */
@Global()
@Module({
  controllers: [NotificationsController, ActivityController, AuditController],
  providers: [NotificationsService, ActivityService, AuditService],
  exports: [NotificationsService, ActivityService, AuditService],
})
export class EventsModule {}
