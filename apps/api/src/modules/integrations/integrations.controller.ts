import { Body, Controller, ForbiddenException, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { IntegrationsService } from './integrations.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const eventsArr = z.array(z.string()).optional();
const UpdateSchema = z.object({
  slack: z.object({ webhookUrl: z.string().optional(), events: eventsArr, enabled: z.boolean().optional() }).optional(),
  telegram: z
    .object({ botToken: z.string().optional(), chatId: z.string().optional(), events: eventsArr, enabled: z.boolean().optional() })
    .optional(),
  github: z.object({ token: z.string().optional(), repo: z.string().optional(), enabled: z.boolean().optional() }).optional(),
  jira: z
    .object({
      domain: z.string().optional(),
      email: z.string().optional(),
      token: z.string().optional(),
      projectKey: z.string().optional(),
      enabled: z.boolean().optional(),
    })
    .optional(),
});

function requireAdmin(user: AuthUser) {
  if (!user.roles.some((r) => r === 'owner' || r === 'admin')) {
    throw new ForbiddenException('Only owners and admins can manage integrations');
  }
}

@ApiTags('integrations')
@Controller('org/integrations')
export class IntegrationsWorkspaceController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    requireAdmin(user);
    return this.integrations.getConfig(user.organizationId);
  }

  @Patch()
  update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(UpdateSchema)) dto: z.infer<typeof UpdateSchema>,
  ) {
    requireAdmin(user);
    return this.integrations.updateConfig(user.organizationId, dto);
  }

  @Post(':provider/test')
  test(@CurrentUser() user: AuthUser, @Param('provider') provider: string) {
    requireAdmin(user);
    return this.integrations.test(user.organizationId, provider);
  }
}
