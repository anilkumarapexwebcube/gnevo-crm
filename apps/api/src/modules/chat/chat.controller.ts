import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { ChatService } from './chat.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const CreateChannelSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(400).optional(),
  isPrivate: z.boolean().optional(),
  memberIds: z.array(z.string().uuid()).optional(),
});
const MessageSchema = z.object({ body: z.string().min(1).max(4000) });
const DmSchema = z.object({ userId: z.string().uuid() });

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('channels')
  listChannels(@CurrentUser() user: AuthUser) {
    return this.chat.listChannels(user.organizationId, user.id);
  }

  @Post('channels')
  createChannel(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateChannelSchema))
    dto: { name: string; description?: string; isPrivate?: boolean; memberIds?: string[] },
  ) {
    return this.chat.createChannel(user.organizationId, user.id, dto);
  }

  @Post('dm')
  openDm(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(DmSchema)) dto: { userId: string },
  ) {
    return this.chat.openDm(user.organizationId, user.id, dto.userId);
  }

  @Get('unread')
  unread(@CurrentUser() user: AuthUser) {
    return this.chat.unreadTotal(user.organizationId, user.id);
  }

  @Get('channels/:id/messages')
  messages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('before') before?: string,
  ) {
    return this.chat.getMessages(user.organizationId, user.id, id, before);
  }

  @Post('channels/:id/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(MessageSchema)) dto: { body: string },
  ) {
    return this.chat.postMessage(user.organizationId, user.id, user.fullName, id, dto.body);
  }

  @Post('channels/:id/read')
  read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.markRead(user.organizationId, user.id, id);
  }
}
