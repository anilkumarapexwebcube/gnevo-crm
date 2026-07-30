import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { CalendarService } from './calendar.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  location: z.string().max(300).optional(),
  meetingUrl: z.string().url().max(500).optional().or(z.literal('')),
  startAt: z.string(),
  endAt: z.string(),
  allDay: z.boolean().optional(),
  type: z.enum(['event', 'meeting']).optional(),
  attendeeIds: z.array(z.string().uuid()).optional(),
});
const UpdateSchema = CreateSchema.partial();
const RespondSchema = z.object({ status: z.enum(['accepted', 'declined']) });

@ApiTags('calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('events')
  list(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.calendar.list(user.organizationId, user.id, from, to);
  }

  @Get('upcoming')
  upcoming(@CurrentUser() user: AuthUser) {
    return this.calendar.upcoming(user.organizationId, user.id);
  }

  @Post('events')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateSchema)) dto: z.infer<typeof CreateSchema>,
  ) {
    return this.calendar.create(user.organizationId, user.id, user.fullName, {
      ...dto,
      meetingUrl: dto.meetingUrl || undefined,
    });
  }

  @Patch('events/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSchema)) dto: z.infer<typeof UpdateSchema>,
  ) {
    return this.calendar.update(user.organizationId, user.id, id, {
      ...dto,
      meetingUrl: dto.meetingUrl === undefined ? undefined : dto.meetingUrl || '',
    });
  }

  @Post('events/:id/summary')
  summarize(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.calendar.summarize(user.organizationId, id);
  }

  @Post('events/:id/respond')
  respond(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RespondSchema)) dto: { status: 'accepted' | 'declined' },
  ) {
    return this.calendar.respond(user.organizationId, user.id, id, dto.status);
  }

  @Delete('events/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.calendar.remove(user.organizationId, user.id, id);
  }
}
