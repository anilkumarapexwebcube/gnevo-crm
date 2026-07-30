import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AddTicketMessageSchema,
  CreateTicketRequestSchema,
  UpdateTicketRequestSchema,
  type AddTicketMessage,
  type AuthUser,
  type CreateTicketRequest,
  type UpdateTicketRequest,
} from '@gnevo/types';
import { z } from 'zod';
import { SupportService } from './support.service.js';
import { IntegrationsService } from '../integrations/integrations.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly support: SupportService,
    private readonly integrations: IntegrationsService,
  ) {}

  @Get()
  @RequirePermissions({ resource: 'ticket', action: 'view' })
  list(@CurrentUser() user: AuthUser) {
    return this.support.listTickets(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions({ resource: 'ticket', action: 'view' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.support.getTicket(user.organizationId, id);
  }

  @Post()
  @RequirePermissions({ resource: 'ticket', action: 'create' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateTicketRequestSchema)) dto: CreateTicketRequest,
  ) {
    return this.support.createTicket(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions({ resource: 'ticket', action: 'update' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTicketRequestSchema)) dto: UpdateTicketRequest,
  ) {
    return this.support.updateTicket(user.organizationId, id, dto);
  }

  @Post(':id/messages')
  @RequirePermissions({ resource: 'ticket', action: 'update' })
  addMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddTicketMessageSchema)) dto: AddTicketMessage,
  ) {
    return this.support.addMessage(user.organizationId, id, user.id, dto);
  }

  @Post(':id/issue')
  @RequirePermissions({ resource: 'ticket', action: 'update' })
  async createIssue(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(z.object({ provider: z.enum(['github', 'jira']) })))
    dto: { provider: 'github' | 'jira' },
  ) {
    const ticket = await this.support.getTicket(user.organizationId, id);
    const body = `${(ticket as { description?: string }).description ?? ''}\n\n— Created from Gnevo CRM ticket ${id.slice(0, 8)}`;
    return this.integrations.createIssue(user.organizationId, dto.provider, {
      title: (ticket as { subject?: string }).subject ?? 'Support ticket',
      body,
    });
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'ticket', action: 'delete' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.support.removeTicket(user.organizationId, id);
  }
}
