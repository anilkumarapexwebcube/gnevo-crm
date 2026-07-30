import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreateAutomationRequestSchema,
  UpdateAutomationRequestSchema,
  type AuthUser,
  type CreateAutomationRequest,
  type UpdateAutomationRequest,
} from '@gnevo/types';
import { AutomationsService } from './automations.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@ApiTags('automations')
@ApiBearerAuth()
@Controller('automations')
export class AutomationsController {
  constructor(private readonly automations: AutomationsService) {}

  @Get()
  @RequirePermissions({ resource: 'automation', action: 'view' })
  list(@CurrentUser() user: AuthUser) {
    return this.automations.list(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions({ resource: 'automation', action: 'view' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.automations.get(user.organizationId, id);
  }

  @Post()
  @RequirePermissions({ resource: 'automation', action: 'create' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateAutomationRequestSchema)) dto: CreateAutomationRequest,
  ) {
    return this.automations.create(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions({ resource: 'automation', action: 'update' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAutomationRequestSchema)) dto: UpdateAutomationRequest,
  ) {
    return this.automations.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'automation', action: 'delete' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.automations.remove(user.organizationId, id);
  }
}
