import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { RolesService } from './roles.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const permArr = z.array(z.object({ resource: z.string(), action: z.string(), scope: z.string().optional() }));
const CreateSchema = z.object({ name: z.string().min(1).max(80), permissions: permArr.default([]) });
const UpdateSchema = z.object({ name: z.string().min(1).max(80).optional(), permissions: permArr.optional() });
const CloneSchema = z.object({ name: z.string().min(1).max(80).optional() });

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('catalog')
  @RequirePermissions({ resource: 'role', action: 'view' })
  catalog() {
    return this.roles.catalog();
  }

  @Get()
  @RequirePermissions({ resource: 'role', action: 'view' })
  list(@CurrentUser() user: AuthUser) {
    return this.roles.list(user.organizationId);
  }

  @Post()
  @RequirePermissions({ resource: 'role', action: 'manage' })
  create(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(CreateSchema)) dto: z.infer<typeof CreateSchema>) {
    return this.roles.create(user.organizationId, dto);
  }

  @Post(':id/clone')
  @RequirePermissions({ resource: 'role', action: 'manage' })
  clone(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodValidationPipe(CloneSchema)) dto: z.infer<typeof CloneSchema>) {
    return this.roles.clone(user.organizationId, id, dto.name);
  }

  @Patch(':id')
  @RequirePermissions({ resource: 'role', action: 'manage' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodValidationPipe(UpdateSchema)) dto: z.infer<typeof UpdateSchema>) {
    return this.roles.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'role', action: 'manage' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.roles.remove(user.organizationId, id);
  }
}
