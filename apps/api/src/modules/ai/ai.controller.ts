import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AiChatRequestSchema, type AiChatRequest, type AuthUser } from '@gnevo/types';
import { AiService } from './ai.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('chat')
  @RequirePermissions({ resource: 'ai', action: 'create' })
  chat(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(AiChatRequestSchema)) dto: AiChatRequest) {
    return this.ai.chat(user.organizationId, dto.messages);
  }
}
