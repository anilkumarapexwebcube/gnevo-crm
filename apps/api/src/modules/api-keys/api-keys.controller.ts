import { Body, Controller, Delete, ForbiddenException, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { ApiKeysService } from './api-keys.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const CreateKeySchema = z.object({ name: z.string().min(1).max(80) });

function requireAdmin(user: AuthUser) {
  if (!user.roles.some((r) => r === 'owner' || r === 'admin')) {
    throw new ForbiddenException('Only owners and admins can manage API keys');
  }
}

@ApiTags('api-keys')
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly keys: ApiKeysService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    requireAdmin(user);
    return this.keys.list(user.organizationId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateKeySchema)) dto: { name: string },
  ) {
    requireAdmin(user);
    return this.keys.create(user.organizationId, dto.name, user.id);
  }

  @Delete(':id')
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    requireAdmin(user);
    return this.keys.revoke(user.organizationId, id);
  }
}
