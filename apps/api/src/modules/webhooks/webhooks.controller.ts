import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { WebhooksService } from './webhooks.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const CreateSchema = z.object({
  url: z.string().url().max(500),
  events: z.array(z.string().max(60)).max(30).default([]),
});
const UpdateSchema = z.object({
  url: z.string().url().max(500).optional(),
  events: z.array(z.string().max(60)).max(30).optional(),
});

function requireAdmin(user: AuthUser) {
  if (!user.roles.some((r) => r === 'owner' || r === 'admin')) {
    throw new ForbiddenException('Only owners and admins can manage webhooks');
  }
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    requireAdmin(user);
    return this.webhooks.list(user.organizationId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateSchema)) dto: { url: string; events: string[] },
  ) {
    requireAdmin(user);
    return this.webhooks.create(user.organizationId, dto.url, dto.events);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSchema)) dto: { url?: string; events?: string[] },
  ) {
    requireAdmin(user);
    return this.webhooks.update(user.organizationId, id, dto);
  }

  @Post(':id/toggle')
  @HttpCode(200)
  toggle(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    requireAdmin(user);
    return this.webhooks.toggle(user.organizationId, id);
  }

  @Post(':id/regenerate-secret')
  @HttpCode(200)
  regenerate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    requireAdmin(user);
    return this.webhooks.regenerateSecret(user.organizationId, id);
  }

  @Post(':id/test')
  @HttpCode(200)
  test(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    requireAdmin(user);
    return this.webhooks.test(user.organizationId, id);
  }

  @Get(':id/deliveries')
  deliveries(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    requireAdmin(user);
    return this.webhooks.listDeliveries(user.organizationId, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    requireAdmin(user);
    return this.webhooks.remove(user.organizationId, id);
  }
}
