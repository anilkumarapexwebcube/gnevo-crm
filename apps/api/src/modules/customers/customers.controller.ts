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
  CreateContactRequestSchema,
  CreateCustomerRequestSchema,
  ListCustomersQuerySchema,
  UpdateCustomerRequestSchema,
  type AuthUser,
  type CreateContactRequest,
  type CreateCustomerRequest,
  type ListCustomersQuery,
  type UpdateCustomerRequest,
} from '@gnevo/types';
import { CustomersService } from './customers.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermissions({ resource: 'customer', action: 'view' })
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(ListCustomersQuerySchema)) query: ListCustomersQuery,
  ) {
    return this.customers.list(user.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions({ resource: 'customer', action: 'view' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customers.get(user.organizationId, id);
  }

  @Post()
  @RequirePermissions({ resource: 'customer', action: 'create' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateCustomerRequestSchema)) dto: CreateCustomerRequest,
  ) {
    return this.customers.create(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions({ resource: 'customer', action: 'update' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCustomerRequestSchema)) dto: UpdateCustomerRequest,
  ) {
    return this.customers.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'customer', action: 'delete' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customers.remove(user.organizationId, id, user.id);
  }

  @Get(':id/contacts')
  @RequirePermissions({ resource: 'contact', action: 'view' })
  listContacts(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customers.listContacts(user.organizationId, id);
  }

  @Post(':id/contacts')
  @RequirePermissions({ resource: 'contact', action: 'create' })
  addContact(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateContactRequestSchema)) dto: CreateContactRequest,
  ) {
    return this.customers.addContact(user.organizationId, id, dto);
  }

  @Post(':id/insights')
  @RequirePermissions({ resource: 'ai', action: 'create' })
  insights(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customers.insights(user.organizationId, id);
  }

  @Post(':id/snapshot')
  captureSnapshot(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customers.captureSnapshot(user.organizationId, id);
  }

  @Post(':id/account-manager')
  @RequirePermissions({ resource: 'customer', action: 'update' })
  setAccountManager(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(z.object({ userId: z.string().uuid().nullable() }))) dto: { userId: string | null },
  ) {
    return this.customers.setAccountManager(user.organizationId, id, dto.userId);
  }

  @Get(':id/snapshots')
  listSnapshots(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customers.listSnapshots(user.organizationId, id);
  }
}
