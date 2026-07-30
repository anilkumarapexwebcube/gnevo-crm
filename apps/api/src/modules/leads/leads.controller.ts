import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  CreateLeadRequestSchema,
  ListLeadsQuerySchema,
  UpdateLeadRequestSchema,
  type AuthUser,
  type CreateLeadRequest,
  type ListLeadsQuery,
  type UpdateLeadRequest,
} from '@gnevo/types';

const MergeLeadsSchema = z.object({
  survivorId: z.string().uuid(),
  losingId: z.string().uuid(),
  data: z.object({
    name: z.string().min(1).max(160).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    company: z.string().max(160).nullable().optional(),
    source: z.string().optional(),
    status: z.string().optional(),
  }),
});
import { LeadsService } from './leads.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @RequirePermissions({ resource: 'lead', action: 'view' })
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(ListLeadsQuerySchema)) query: ListLeadsQuery,
  ) {
    return this.leads.list(user.organizationId, query);
  }

  // Declared before ':id' so "duplicates" isn't captured as an id param.
  @Get('duplicates')
  @RequirePermissions({ resource: 'lead', action: 'view' })
  duplicates(@CurrentUser() user: AuthUser) {
    return this.leads.duplicates(user.organizationId);
  }

  @Post('merge')
  @RequirePermissions({ resource: 'lead', action: 'update' })
  merge(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(MergeLeadsSchema))
    dto: {
      survivorId: string;
      losingId: string;
      data: {
        name?: string;
        email?: string | null;
        phone?: string | null;
        company?: string | null;
        source?: string;
        status?: string;
      };
    },
  ) {
    return this.leads.merge(user.organizationId, dto.survivorId, dto.losingId, dto.data, user.id);
  }

  @Get(':id')
  @RequirePermissions({ resource: 'lead', action: 'view' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leads.get(user.organizationId, id);
  }

  @Post()
  @RequirePermissions({ resource: 'lead', action: 'create' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateLeadRequestSchema)) dto: CreateLeadRequest,
  ) {
    return this.leads.create(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions({ resource: 'lead', action: 'update' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateLeadRequestSchema)) dto: UpdateLeadRequest,
  ) {
    return this.leads.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'lead', action: 'delete' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leads.remove(user.organizationId, id, user.id);
  }

  @Post(':id/score')
  @RequirePermissions({ resource: 'lead', action: 'update' })
  score(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leads.score(user.organizationId, id);
  }

  @Post(':id/convert')
  @RequirePermissions({ resource: 'lead', action: 'update' })
  convert(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leads.convert(user.organizationId, id, user.id);
  }
}
