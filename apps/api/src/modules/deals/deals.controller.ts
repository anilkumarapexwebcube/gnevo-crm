import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreateDealRequestSchema,
  MoveDealRequestSchema,
  type AuthUser,
  type CreateDealRequest,
  type MoveDealRequest,
} from '@gnevo/types';
import { DealsService } from './deals.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@ApiTags('deals')
@ApiBearerAuth()
@Controller('deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get('board')
  @RequirePermissions({ resource: 'deal', action: 'view' })
  board(@CurrentUser() user: AuthUser) {
    return this.deals.getBoard(user.organizationId);
  }

  @Post()
  @RequirePermissions({ resource: 'deal', action: 'create' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateDealRequestSchema)) dto: CreateDealRequest,
  ) {
    return this.deals.create(user.organizationId, dto);
  }

  @Patch(':id/move')
  @RequirePermissions({ resource: 'deal', action: 'update' })
  move(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(MoveDealRequestSchema)) dto: MoveDealRequest,
  ) {
    return this.deals.move(user.organizationId, id, dto.stageId);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'deal', action: 'delete' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.deals.remove(user.organizationId, id);
  }
}
