import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@gnevo/types';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async search(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
  ): Promise<{ results: SearchResult[] }> {
    const term = (q ?? '').trim();
    if (term.length < 1) return { results: [] };
    const db = this.prisma.forTenant(user.organizationId);
    const c = { contains: term, mode: 'insensitive' as const };

    const [leads, customers, deals, projects, tickets, articles] = await Promise.all([
      db.lead.findMany({ where: { deletedAt: null, name: c }, take: 5, select: { id: true, name: true, company: true } }),
      db.customer.findMany({ where: { deletedAt: null, name: c }, take: 5, select: { id: true, name: true } }),
      db.deal.findMany({ where: { deletedAt: null, title: c }, take: 5, select: { id: true, title: true } }),
      db.project.findMany({ where: { deletedAt: null, name: c }, take: 5, select: { id: true, name: true } }),
      db.ticket.findMany({ where: { deletedAt: null, subject: c }, take: 5, select: { id: true, subject: true } }),
      db.article.findMany({ where: { deletedAt: null, title: c }, take: 5, select: { id: true, title: true } }),
    ]);

    const results: SearchResult[] = [
      ...leads.map((l) => ({ type: 'Lead', id: l.id, title: l.name, subtitle: l.company ?? undefined, href: `/leads/${l.id}` })),
      ...customers.map((x) => ({ type: 'Customer', id: x.id, title: x.name, href: `/customers/${x.id}` })),
      ...deals.map((d) => ({ type: 'Deal', id: d.id, title: d.title, href: `/deals` })),
      ...projects.map((p) => ({ type: 'Project', id: p.id, title: p.name, href: `/projects/${p.id}` })),
      ...tickets.map((t) => ({ type: 'Ticket', id: t.id, title: t.subject, href: `/tickets/${t.id}` })),
      ...articles.map((a) => ({ type: 'Article', id: a.id, title: a.title, href: `/kb/${a.id}` })),
    ];
    return { results };
  }
}
