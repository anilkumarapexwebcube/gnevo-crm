import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller.js';
import { PortalService } from './portal.service.js';
import { PortalAuthGuard } from '../../common/guards/portal-auth.guard.js';

@Module({
  controllers: [PortalController],
  providers: [PortalService, PortalAuthGuard],
})
export class PortalModule {}
