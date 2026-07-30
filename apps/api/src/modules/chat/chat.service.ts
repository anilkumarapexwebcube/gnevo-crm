import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../events/notifications.service.js';

interface CreateChannelInput {
  name: string;
  description?: string;
  isPrivate?: boolean;
  memberIds?: string[];
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Channels the user can see: all public channels + private/DM channels they belong to. */
  async listChannels(organizationId: string, userId: string) {
    const db = this.prisma.forTenant(organizationId);
    const channels = await db.chatChannel.findMany({
      where: {
        OR: [
          { isPrivate: false, isDm: false },
          { members: { some: { userId } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        members: { include: { user: { select: { id: true, fullName: true } } } },
        _count: { select: { messages: true } },
      },
    });

    return Promise.all(
      channels.map(async (c) => {
        const mine = c.members.find((m) => m.userId === userId);
        const unread = await db.chatMessage.count({
          where: {
            channelId: c.id,
            authorId: { not: userId },
            ...(mine?.lastReadAt ? { createdAt: { gt: mine.lastReadAt } } : {}),
          },
        });
        const other = c.isDm ? c.members.find((m) => m.userId !== userId)?.user : null;
        return {
          id: c.id,
          name: c.isDm ? other?.fullName ?? 'Direct message' : c.name,
          description: c.description,
          isPrivate: c.isPrivate,
          isDm: c.isDm,
          memberCount: c.members.length,
          messageCount: c._count.messages,
          unread: mine || c.isPrivate || c.isDm ? unread : 0,
          updatedAt: c.updatedAt,
        };
      }),
    );
  }

  async createChannel(organizationId: string, userId: string, dto: CreateChannelInput) {
    const db = this.prisma.forTenant(organizationId);
    const memberIds = Array.from(new Set([userId, ...(dto.memberIds ?? [])]));
    const channel = await db.chatChannel.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description ?? null,
        isPrivate: dto.isPrivate ?? false,
        isDm: false,
        createdBy: userId,
        members: {
          create: memberIds.map((uid) => ({
            organizationId,
            userId: uid,
            ...(uid === userId ? { lastReadAt: new Date() } : {}),
          })),
        },
      },
    });
    return { id: channel.id };
  }

  /** Find-or-create a 1:1 DM channel between the current user and another. */
  async openDm(organizationId: string, userId: string, otherUserId: string) {
    if (otherUserId === userId) throw new ForbiddenException('Cannot DM yourself');
    const db = this.prisma.forTenant(organizationId);
    const dmKey = [userId, otherUserId].sort().join(':');
    const existing = await db.chatChannel.findFirst({ where: { dmKey } });
    if (existing) return { id: existing.id };
    const other = await db.user.findFirst({ where: { id: otherUserId }, select: { id: true } });
    if (!other) throw new NotFoundException('User not found');
    const channel = await db.chatChannel.create({
      data: {
        organizationId,
        name: 'Direct message',
        isPrivate: true,
        isDm: true,
        dmKey,
        createdBy: userId,
        members: {
          create: [
            { organizationId, userId, lastReadAt: new Date() },
            { organizationId, userId: otherUserId },
          ],
        },
      },
    });
    return { id: channel.id };
  }

  private async access(db: ReturnType<PrismaService['forTenant']>, channelId: string, userId: string) {
    const channel = await db.chatChannel.findFirst({
      where: { id: channelId },
      include: { members: { select: { userId: true, lastReadAt: true } } },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    const isMember = channel.members.some((m) => m.userId === userId);
    if ((channel.isPrivate || channel.isDm) && !isMember) {
      throw new ForbiddenException('Not a member of this channel');
    }
    return { channel, isMember };
  }

  async getMessages(organizationId: string, userId: string, channelId: string, before?: string) {
    const db = this.prisma.forTenant(organizationId);
    const { channel, isMember } = await this.access(db, channelId, userId);

    const messages = await db.chatMessage.findMany({
      where: {
        channelId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Auto-join public channels so unread tracking works, and mark as read.
    if (isMember) {
      await db.chatChannelMember.updateMany({
        where: { channelId, userId },
        data: { lastReadAt: new Date() },
      });
    } else if (!channel.isPrivate && !channel.isDm) {
      await db.chatChannelMember.create({
        data: { organizationId, channelId, userId, lastReadAt: new Date() },
      });
    }

    return {
      channel: { id: channel.id, name: channel.name, isDm: channel.isDm, isPrivate: channel.isPrivate },
      messages: messages.reverse(),
    };
  }

  async postMessage(
    organizationId: string,
    userId: string,
    userName: string,
    channelId: string,
    body: string,
  ) {
    const db = this.prisma.forTenant(organizationId);
    const { channel } = await this.access(db, channelId, userId);
    const message = await db.chatMessage.create({
      data: { organizationId, channelId, authorId: userId, authorName: userName, body },
    });
    await db.chatChannel.update({ where: { id: channelId }, data: { updatedAt: new Date() } });

    // Notify other members (best-effort).
    const members = await db.chatChannelMember.findMany({
      where: { channelId, userId: { not: userId } },
      select: { userId: true },
    });
    const label = channel.isDm ? userName : `#${channel.name}`;
    const preview = body.length > 80 ? `${body.slice(0, 80)}…` : body;
    await Promise.all(
      members.map((m) =>
        this.notifications.notify(organizationId, m.userId, {
          title: `New message in ${label}`,
          body: preview,
          link: `/chat?c=${channelId}`,
          type: 'chat',
        }),
      ),
    );
    return message;
  }

  async markRead(organizationId: string, userId: string, channelId: string): Promise<{ ok: true }> {
    const db = this.prisma.forTenant(organizationId);
    await db.chatChannelMember.updateMany({
      where: { channelId, userId },
      data: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  async unreadTotal(organizationId: string, userId: string): Promise<{ count: number }> {
    const list = await this.listChannels(organizationId, userId);
    return { count: list.reduce((sum, c) => sum + c.unread, 0) };
  }
}
