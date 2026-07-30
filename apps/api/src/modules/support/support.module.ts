import { Module } from '@nestjs/common';
import { SupportService } from './support.service.js';
import { TicketsController } from './tickets.controller.js';
import { KbController } from './kb.controller.js';
import { AnnouncementsController } from './announcements.controller.js';

@Module({
  controllers: [TicketsController, KbController, AnnouncementsController],
  providers: [SupportService],
})
export class SupportModule {}
