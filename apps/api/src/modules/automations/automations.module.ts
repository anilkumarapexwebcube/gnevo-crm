import { Global, Module } from '@nestjs/common';
import { AutomationsController } from './automations.controller.js';
import { AutomationsService } from './automations.service.js';
import { AutomationEngineService } from './automation-engine.service.js';

// Global so domain services (leads/customers/deals) can inject the engine.
@Global()
@Module({
  controllers: [AutomationsController],
  providers: [AutomationsService, AutomationEngineService],
  exports: [AutomationEngineService],
})
export class AutomationsModule {}
