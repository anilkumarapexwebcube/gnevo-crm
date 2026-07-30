import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { NotesService } from './notes.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const CreateNoteSchema = z.object({
  entityType: z.enum(['customer', 'lead', 'deal']),
  entityId: z.string().uuid(),
  kind: z.enum(['note', 'call', 'email', 'meeting']).optional(),
  body: z.string().min(1).max(5000),
});

@ApiTags('notes')
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateNoteSchema))
    dto: { entityType: string; entityId: string; kind?: string; body: string },
  ) {
    return this.notes.create(user.organizationId, user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.notes.list(user.organizationId, entityType, entityId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notes.remove(user.organizationId, id);
  }
}
