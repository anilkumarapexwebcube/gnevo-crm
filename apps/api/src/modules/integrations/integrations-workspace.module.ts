import { Global, Module } from '@nestjs/common';
import { IntegrationsWorkspaceController } from './integrations.controller.js';
import { IntegrationsService } from './integrations.service.js';

/** Outbound workspace integrations (Slack/Telegram/GitHub/Jira). Global so the
 *  automation engine and tickets can dispatch/create issues. */
@Global()
@Module({
  controllers: [IntegrationsWorkspaceController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsWorkspaceModule {}
