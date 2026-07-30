import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { InvitationsService } from './invitations.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const CreateSchema = z.object({
  email: z.string().email(),
  roleKey: z.enum(['admin', 'hr', 'manager', 'member', 'viewer']).optional(),
  departmentId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
});
const BulkSchema = z.object({
  emails: z.array(z.string()).min(1).max(200),
  roleKey: z.enum(['admin', 'hr', 'manager', 'member', 'viewer']).optional(),
});
const AcceptSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().min(1).max(120),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get()
  @RequirePermissions({ resource: 'user', action: 'manage' })
  list(@CurrentUser() user: AuthUser) {
    return this.invitations.list(user.organizationId);
  }

  @Post()
  @RequirePermissions({ resource: 'user', action: 'manage' })
  create(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(CreateSchema)) dto: z.infer<typeof CreateSchema>) {
    return this.invitations.create(user.organizationId, { id: user.id, name: user.fullName, roles: user.roles }, dto);
  }

  @Post('bulk')
  @RequirePermissions({ resource: 'user', action: 'manage' })
  bulk(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(BulkSchema)) dto: z.infer<typeof BulkSchema>) {
    return this.invitations.bulk(user.organizationId, { id: user.id, name: user.fullName, roles: user.roles }, dto.emails, dto.roleKey);
  }

  @Post(':id/resend')
  @RequirePermissions({ resource: 'user', action: 'manage' })
  resend(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invitations.resend(user.organizationId, id);
  }

  @Post(':id/cancel')
  @RequirePermissions({ resource: 'user', action: 'manage' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invitations.cancel(user.organizationId, id, user.id);
  }

  @Public()
  @Get('verify')
  verify(@Query('token') token: string) {
    return this.invitations.verify(token ?? '');
  }

  @Public()
  @Post('accept')
  accept(@Body(new ZodValidationPipe(AcceptSchema)) dto: z.infer<typeof AcceptSchema>, @Req() req: Request) {
    return this.invitations.accept(dto.token, dto.fullName, dto.password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
