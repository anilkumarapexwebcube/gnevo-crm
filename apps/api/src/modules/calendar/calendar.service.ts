import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../events/notifications.service.js';
import { orgChat } from '../../common/ai.helper.js';

interface EventInput {
  title: string;
  description?: string;
  location?: string;
  meetingUrl?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  type?: string;
  attendeeIds?: string[];
}

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Events overlapping [from, to], plus events the user attends regardless. */
  async list(organizationId: string, userId: string, from?: string, to?: string) {
    const db = this.prisma.forTenant(organizationId);
    const range =
      from && to
        ? { startAt: { lte: new Date(to) }, endAt: { gte: new Date(from) } }
        : {};
    const events = await db.calendarEvent.findMany({
      where: range,
      orderBy: { startAt: 'asc' },
      include: {
        attendees: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });
    return events.map((e) => ({
      ...e,
      attendees: e.attendees.map((a) => ({
        userId: a.userId,
        name: a.user.fullName,
        status: a.status,
      })),
      mine: e.createdBy === userId || e.attendees.some((a) => a.userId === userId),
    }));
  }

  /** Upcoming meetings the user is invited to or created (next 30 days). */
  async upcoming(organizationId: string, userId: string) {
    const db = this.prisma.forTenant(organizationId);
    const now = new Date();
    const horizon = new Date(now.getTime() + 30 * 86_400_000);
    const events = await db.calendarEvent.findMany({
      where: {
        startAt: { gte: now, lte: horizon },
        OR: [{ createdBy: userId }, { attendees: { some: { userId } } }],
      },
      orderBy: { startAt: 'asc' },
      take: 10,
      include: { attendees: { include: { user: { select: { id: true, fullName: true } } } } },
    });
    return events.map((e) => ({
      ...e,
      attendees: e.attendees.map((a) => ({ userId: a.userId, name: a.user.fullName, status: a.status })),
    }));
  }

  async create(organizationId: string, userId: string, userName: string, dto: EventInput) {
    const db = this.prisma.forTenant(organizationId);
    const attendeeIds = Array.from(new Set(dto.attendeeIds ?? []));
    const event = await db.calendarEvent.create({
      data: {
        organizationId,
        title: dto.title,
        description: dto.description ?? null,
        location: dto.location ?? null,
        meetingUrl: dto.meetingUrl ?? null,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        allDay: dto.allDay ?? false,
        type: dto.type === 'meeting' ? 'meeting' : 'event',
        createdBy: userId,
        attendees: {
          create: attendeeIds.map((uid) => ({
            organizationId,
            userId: uid,
            status: uid === userId ? 'accepted' : 'invited',
          })),
        },
      },
    });

    const when = new Date(dto.startAt).toLocaleString();
    await Promise.all(
      attendeeIds
        .filter((uid) => uid !== userId)
        .map((uid) =>
          this.notifications.notify(organizationId, uid, {
            title: `${userName} invited you: ${dto.title}`,
            body: `${when}${dto.meetingUrl ? ` · ${dto.meetingUrl}` : ''}`,
            link: '/calendar',
            type: 'meeting',
          }),
        ),
    );
    return { id: event.id };
  }

  async update(organizationId: string, userId: string, id: string, dto: Partial<EventInput>) {
    const db = this.prisma.forTenant(organizationId);
    const event = await db.calendarEvent.findFirst({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.createdBy && event.createdBy !== userId) {
      throw new ForbiddenException('Only the organizer can edit this event');
    }

    await db.calendarEvent.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.location !== undefined ? { location: dto.location || null } : {}),
        ...(dto.meetingUrl !== undefined ? { meetingUrl: dto.meetingUrl || null } : {}),
        ...(dto.startAt !== undefined ? { startAt: new Date(dto.startAt) } : {}),
        ...(dto.endAt !== undefined ? { endAt: new Date(dto.endAt) } : {}),
        ...(dto.allDay !== undefined ? { allDay: dto.allDay } : {}),
      },
    });

    // Reconcile attendees if provided.
    if (dto.attendeeIds) {
      const wanted = new Set(dto.attendeeIds);
      const existing = await db.calendarAttendee.findMany({ where: { eventId: id }, select: { userId: true } });
      const existingIds = new Set(existing.map((a) => a.userId));
      const toAdd = [...wanted].filter((u) => !existingIds.has(u));
      const toRemove = [...existingIds].filter((u) => !wanted.has(u) && u !== event.createdBy);
      if (toRemove.length) {
        await db.calendarAttendee.deleteMany({ where: { eventId: id, userId: { in: toRemove } } });
      }
      if (toAdd.length) {
        await db.calendarAttendee.createMany({
          data: toAdd.map((uid) => ({ organizationId, eventId: id, userId: uid, status: 'invited' })),
          skipDuplicates: true,
        });
      }
    }
    return { ok: true };
  }

  async respond(organizationId: string, userId: string, id: string, status: 'accepted' | 'declined') {
    const db = this.prisma.forTenant(organizationId);
    const updated = await db.calendarAttendee.updateMany({
      where: { eventId: id, userId },
      data: { status },
    });
    if (updated.count === 0) throw new NotFoundException('You are not invited to this event');
    return { ok: true };
  }

  /** AI-generated meeting summary / minutes from the event details + attendees. */
  async summarize(organizationId: string, id: string): Promise<{ summary: string }> {
    const db = this.prisma.forTenant(organizationId);
    const event = await db.calendarEvent.findFirst({
      where: { id },
      include: { attendees: { include: { user: { select: { fullName: true } } } } },
    });
    if (!event) throw new NotFoundException('Event not found');

    const attendees = event.attendees.map((a) => `${a.user.fullName} (${a.status})`).join(', ') || 'none';
    const facts =
      `Title: ${event.title}\n` +
      `Type: ${event.type}\n` +
      `When: ${event.startAt.toISOString()} → ${event.endAt.toISOString()}\n` +
      `Location: ${event.location ?? 'n/a'}\n` +
      `Attendees: ${attendees}\n` +
      `Notes: ${event.description ?? '(none)'}`;
    const prompt =
      `You are an assistant preparing a concise meeting brief for a marketing agency. ` +
      `Based on the details below, write a short summary with: a one-line purpose, 2-4 suggested agenda points, ` +
      `and a short list of likely action items. Keep it under 120 words. Plain text, no markdown headers.\n\n${facts}`;

    const summary = (await orgChat(this.prisma, organizationId, [{ role: 'user', content: prompt }])).trim();
    await db.calendarEvent.update({ where: { id }, data: { summary } });
    return { summary };
  }

  async remove(organizationId: string, userId: string, id: string): Promise<{ ok: true }> {
    const db = this.prisma.forTenant(organizationId);
    const event = await db.calendarEvent.findFirst({ where: { id }, select: { id: true, createdBy: true } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.createdBy && event.createdBy !== userId) {
      throw new ForbiddenException('Only the organizer can delete this event');
    }
    await db.calendarEvent.delete({ where: { id } });
    return { ok: true };
  }
}
