import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { ContentService } from './content.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  dueDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
});
const UpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(['idea', 'writing', 'review', 'published']).optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().max(2000).optional(),
});

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.content.list(user.organizationId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateSchema)) dto: { title: string; dueDate?: string; notes?: string },
  ) {
    return this.content.create(user.organizationId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSchema))
    dto: { title?: string; status?: string; dueDate?: string | null; notes?: string },
  ) {
    return this.content.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.content.remove(user.organizationId, id);
  }
}
