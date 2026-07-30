import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AddTicketMessage,
  CreateAnnouncementRequest,
  CreateArticleRequest,
  CreateTicketRequest,
  UpdateArticleRequest,
  UpdateTicketRequest,
} from '@gnevo/types';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../events/activity.service.js';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  // ── Tickets ──

  async listTickets(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.ticket.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true } } },
    });
  }

  async getTicket(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const ticket = await db.ticket.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { fullName: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async createTicket(organizationId: string, dto: CreateTicketRequest) {
    const db = this.prisma.forTenant(organizationId);
    const ticket = await db.ticket.create({
      data: {
        organizationId,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority,
        customerId: dto.customerId ?? null,
      },
    });
    await this.activity.log(organizationId, {
      verb: 'created',
      entityType: 'ticket',
      entityId: ticket.id,
      summary: `Ticket "${ticket.subject}" was opened`,
    });
    return ticket;
  }

  async updateTicket(organizationId: string, id: string, dto: UpdateTicketRequest) {
    await this.getTicket(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    return db.ticket.update({ where: { id }, data: dto });
  }

  async addMessage(organizationId: string, id: string, authorId: string, dto: AddTicketMessage) {
    await this.getTicket(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    return db.ticketMessage.create({
      data: { organizationId, ticketId: id, authorId, body: dto.body },
    });
  }

  async removeTicket(organizationId: string, id: string) {
    await this.getTicket(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    await db.ticket.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }

  // ── Knowledge base ──

  async listArticles(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.article.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } });
  }

  async getArticle(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const article = await db.article.findFirst({ where: { id, deletedAt: null } });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async createArticle(organizationId: string, dto: CreateArticleRequest) {
    const db = this.prisma.forTenant(organizationId);
    return db.article.create({ data: { organizationId, ...dto } });
  }

  async updateArticle(organizationId: string, id: string, dto: UpdateArticleRequest) {
    await this.getArticle(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    return db.article.update({ where: { id }, data: dto });
  }

  async removeArticle(organizationId: string, id: string) {
    await this.getArticle(organizationId, id);
    const db = this.prisma.forTenant(organizationId);
    await db.article.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }

  // ── Announcements ──

  async listAnnouncements(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.announcement.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { fullName: true } } },
    });
  }

  async createAnnouncement(
    organizationId: string,
    authorId: string,
    dto: CreateAnnouncementRequest,
  ) {
    const db = this.prisma.forTenant(organizationId);
    return db.announcement.create({
      data: { organizationId, authorId, title: dto.title, body: dto.body },
    });
  }

  async removeAnnouncement(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const a = await db.announcement.findFirst({ where: { id, deletedAt: null } });
    if (!a) throw new NotFoundException('Announcement not found');
    await db.announcement.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }
}
