import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreateInvoiceRequestSchema,
  ListInvoicesQuerySchema,
  UpdateInvoiceStatusSchema,
  type AuthUser,
  type CreateInvoiceRequest,
  type ListInvoicesQuery,
  type UpdateInvoiceStatus,
} from '@gnevo/types';
import { InvoicesService } from './invoices.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @RequirePermissions({ resource: 'invoice', action: 'view' })
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(ListInvoicesQuerySchema)) query: ListInvoicesQuery,
  ) {
    return this.invoices.list(user.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions({ resource: 'invoice', action: 'view' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoices.get(user.organizationId, id);
  }

  @Post()
  @RequirePermissions({ resource: 'invoice', action: 'create' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateInvoiceRequestSchema)) dto: CreateInvoiceRequest,
  ) {
    return this.invoices.create(user.organizationId, dto);
  }

  @Patch(':id/status')
  @RequirePermissions({ resource: 'invoice', action: 'update' })
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateInvoiceStatusSchema)) dto: UpdateInvoiceStatus,
  ) {
    return this.invoices.setStatus(user.organizationId, id, dto.status);
  }

  @Post(':id/checkout')
  @RequirePermissions({ resource: 'invoice', action: 'update' })
  checkout(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoices.checkout(user.organizationId, id);
  }

  @Post(':id/confirm')
  @RequirePermissions({ resource: 'invoice', action: 'update' })
  confirm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoices.confirmPayment(user.organizationId, id);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'invoice', action: 'delete' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoices.remove(user.organizationId, id, user.id);
  }
}
