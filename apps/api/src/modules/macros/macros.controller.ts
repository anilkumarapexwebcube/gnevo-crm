import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { MacrosService } from './macros.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const category = z.enum(['support', 'sales', 'billing', 'technical', 'custom']);
const CreateSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(8000),
  category: category.optional(),
});
const UpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  body: z.string().min(1).max(8000).optional(),
  category: category.optional(),
});

@ApiTags('macros')
@Controller('macros')
export class MacrosController {
  constructor(private readonly macros: MacrosService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('category') cat?: string,
  ) {
    return this.macros.list(user.organizationId, q, cat);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateSchema)) dto: { title: string; body: string; category?: string },
  ) {
    return this.macros.create(user.organizationId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSchema)) dto: { title?: string; body?: string; category?: string },
  ) {
    return this.macros.update(user.organizationId, id, dto);
  }

  @Post(':id/duplicate')
  duplicate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.macros.duplicate(user.organizationId, id);
  }

  @Post(':id/reorder')
  reorder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(z.object({ direction: z.enum(['up', 'down']) })))
    dto: { direction: 'up' | 'down' },
  ) {
    return this.macros.reorder(user.organizationId, id, dto.direction);
  }

  @Post(':id/use')
  use(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.macros.use(user.organizationId, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.macros.remove(user.organizationId, id);
  }
}
