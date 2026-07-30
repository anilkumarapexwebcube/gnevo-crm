import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hashPassword, verifyPassword } from '@gnevo/auth';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../events/audit.service.js';
import type { PortalPrincipal } from '../../common/guards/portal-auth.guard.js';
import type { Env } from '../../config/config.schema.js';

/** Human-friendly temporary password (no ambiguous chars), ~11 chars. */
function generateTempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(11);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i]! % alphabet.length];
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8)}`;
}

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly audit: AuditService,
  ) {}

  // ─────────────── Agency side (staff, authenticated) ───────────────

  /** List a customer's contacts with their portal-access status. */
  async listContacts(organizationId: string, customerId: string) {
    const db = this.prisma.forTenant(organizationId);
    const customer = await db.customer.findFirst({ where: { id: customerId, deletedAt: null } });
    if (!customer) throw new NotFoundException('Customer not found');

    const contacts = await db.contact.findMany({
      where: { customerId, deletedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        isPrimary: true,
        portalEnabled: true,
        portalLastLoginAt: true,
        portalCanProjects: true,
        portalCanInvoices: true,
        portalCanTickets: true,
      },
    });
    return {
      loginUrl: `${this.config.get('WEB_URL', { infer: true })}/portal/login`,
      contacts,
    };
  }

  /**
   * Enable portal access for a contact and (re)set a temporary password.
   * The plaintext password is returned ONCE so staff can share it with the
   * client; only its hash is stored.
   */
  async enableContact(
    organizationId: string,
    customerId: string,
    contactId: string,
    actorId?: string,
  ) {
    const db = this.prisma.forTenant(organizationId);
    const contact = await db.contact.findFirst({
      where: { id: contactId, customerId, deletedAt: null },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    if (!contact.email) {
      throw new BadRequestException('Add an email to this contact before enabling portal access');
    }

    const tempPassword = generateTempPassword();
    const portalPasswordHash = await hashPassword(tempPassword);
    await db.contact.update({
      where: { id: contactId },
      data: { portalEnabled: true, portalPasswordHash },
    });
    await this.audit.record(organizationId, {
      actorId,
      action: 'portal.access_granted',
      resource: 'contact',
      resourceId: contactId,
      after: { email: contact.email, customerId },
    });

    return {
      email: contact.email,
      tempPassword,
      loginUrl: `${this.config.get('WEB_URL', { infer: true })}/portal/login`,
    };
  }

  /** Revoke a contact's portal access. */
  async disableContact(
    organizationId: string,
    customerId: string,
    contactId: string,
    actorId?: string,
  ) {
    const db = this.prisma.forTenant(organizationId);
    const contact = await db.contact.findFirst({
      where: { id: contactId, customerId, deletedAt: null },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    await db.contact.update({
      where: { id: contactId },
      data: { portalEnabled: false, portalPasswordHash: null },
    });
    await this.audit.record(organizationId, {
      actorId,
      action: 'portal.access_revoked',
      resource: 'contact',
      resourceId: contactId,
    });
    return { ok: true };
  }

  // ─────────────── Client side (portal login) ───────────────

  /** Authenticate a client contact and issue a portal session token. */
  async login(email: string, password: string) {
    // Portal login is org-agnostic: the client only knows their email.
    // Base client (no tenant scope) so we can match across orgs, then verify
    // the password to pin the exact contact.
    const candidates = await this.prisma.contact.findMany({
      where: { email, portalEnabled: true, deletedAt: null, customerId: { not: null } },
    });

    let matched: (typeof candidates)[number] | null = null;
    for (const c of candidates) {
      if (c.portalPasswordHash && (await verifyPassword(password, c.portalPasswordHash))) {
        matched = c;
        break;
      }
    }
    // Constant-ish work / uniform error to avoid enumeration.
    if (!matched || !matched.customerId) {
      if (candidates.length === 0) await hashPassword(password);
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.contact.update({
      where: { id: matched.id },
      data: { portalLastLoginAt: new Date() },
    });

    const token = await this.jwt.signAsync(
      {
        sub: matched.id,
        org: matched.organizationId,
        customerId: matched.customerId,
        type: 'portal',
      },
      { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }), expiresIn: '7d' },
    );
    return { token, expiresIn: 7 * 24 * 60 * 60 };
  }

  /** The signed-in client's own profile. */
  async me(portal: PortalPrincipal) {
    const db = this.prisma.forTenant(portal.organizationId);
    const contact = await db.contact.findFirst({
      where: { id: portal.contactId, deletedAt: null },
      select: {
        name: true, email: true, phone: true, title: true,
        portalCanProjects: true, portalCanInvoices: true, portalCanTickets: true,
        customer: { select: { name: true, accountManagerId: true } },
      },
    });
    if (!contact) throw new UnauthorizedException('Portal account not found');
    let accountManager: string | null = null;
    if (contact.customer?.accountManagerId) {
      const mgr = await this.prisma.user.findFirst({
        where: { id: contact.customer.accountManagerId, organizationId: portal.organizationId },
        select: { fullName: true },
      });
      accountManager = mgr?.fullName ?? null;
    }
    return {
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      title: contact.title,
      company: contact.customer?.name ?? '',
      accountManager,
      permissions: {
        projects: contact.portalCanProjects,
        invoices: contact.portalCanInvoices,
        tickets: contact.portalCanTickets,
      },
    };
  }

  /** A signed-in client updates their own profile. */
  async updateProfile(portal: PortalPrincipal, dto: { name?: string; phone?: string }) {
    const db = this.prisma.forTenant(portal.organizationId);
    await db.contact.update({
      where: { id: portal.contactId },
      data: {
        ...(dto.name?.trim() ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
      },
    });
    return { ok: true };
  }

  /** Read-only data for the signed-in client — gated by their permissions and
   *  by each record's portal visibility. */
  async data(portal: PortalPrincipal) {
    const db = this.prisma.forTenant(portal.organizationId);
    const contact = await db.contact.findFirst({
      where: { id: portal.contactId, deletedAt: null },
      select: { portalCanProjects: true, portalCanInvoices: true, portalCanTickets: true },
    });
    if (!contact) throw new UnauthorizedException('Portal account not found');

    const customer = await db.customer.findFirst({
      where: { id: portal.customerId, deletedAt: null },
      include: {
        invoices: {
          where: { deletedAt: null, portalVisible: true },
          orderBy: { createdAt: 'desc' },
          include: { lines: { select: { quantity: true, unitPrice: true } } },
        },
        tickets: {
          where: { deletedAt: null, portalVisible: true },
          orderBy: { createdAt: 'desc' },
          select: { subject: true, status: true, priority: true, createdAt: true },
        },
        projects: {
          where: { deletedAt: null, portalVisible: true },
          orderBy: { createdAt: 'desc' },
          select: { name: true, status: true },
        },
      },
    });
    if (!customer) throw new NotFoundException('Portal not found');

    return {
      customer: { name: customer.name },
      permissions: {
        projects: contact.portalCanProjects,
        invoices: contact.portalCanInvoices,
        tickets: contact.portalCanTickets,
      },
      invoices: contact.portalCanInvoices
        ? customer.invoices.map((inv) => ({
            number: inv.number,
            status: inv.status,
            currency: inv.currency,
            issuedAt: inv.createdAt,
            total: inv.lines.reduce((s, l) => s + l.quantity * Number(l.unitPrice), 0),
          }))
        : [],
      tickets: contact.portalCanTickets ? customer.tickets : [],
      projects: contact.portalCanProjects ? customer.projects : [],
    };
  }

  /* ── Staff: manage client permissions + portal record sharing ── */

  async setPermissions(
    organizationId: string,
    customerId: string,
    contactId: string,
    perms: { projects?: boolean; invoices?: boolean; tickets?: boolean },
  ) {
    const db = this.prisma.forTenant(organizationId);
    const contact = await db.contact.findFirst({ where: { id: contactId, customerId }, select: { id: true } });
    if (!contact) throw new NotFoundException('Contact not found');
    await db.contact.update({
      where: { id: contactId },
      data: {
        ...(perms.projects !== undefined ? { portalCanProjects: perms.projects } : {}),
        ...(perms.invoices !== undefined ? { portalCanInvoices: perms.invoices } : {}),
        ...(perms.tickets !== undefined ? { portalCanTickets: perms.tickets } : {}),
      },
    });
    return { ok: true };
  }

  async shareable(organizationId: string, customerId: string) {
    const db = this.prisma.forTenant(organizationId);
    const [projects, invoices, tickets] = await Promise.all([
      db.project.findMany({ where: { customerId, deletedAt: null }, select: { id: true, name: true, portalVisible: true }, orderBy: { createdAt: 'desc' } }),
      db.invoice.findMany({ where: { customerId, deletedAt: null }, select: { id: true, number: true, portalVisible: true }, orderBy: { createdAt: 'desc' } }),
      db.ticket.findMany({ where: { customerId, deletedAt: null }, select: { id: true, subject: true, portalVisible: true }, orderBy: { createdAt: 'desc' } }),
    ]);
    return {
      projects: projects.map((p) => ({ id: p.id, label: p.name, visible: p.portalVisible })),
      invoices: invoices.map((i) => ({ id: i.id, label: i.number, visible: i.portalVisible })),
      tickets: tickets.map((t) => ({ id: t.id, label: t.subject, visible: t.portalVisible })),
    };
  }

  async setVisibility(organizationId: string, type: 'project' | 'invoice' | 'ticket', id: string, visible: boolean) {
    const db = this.prisma.forTenant(organizationId);
    if (type === 'project') await db.project.updateMany({ where: { id }, data: { portalVisible: visible } });
    else if (type === 'invoice') await db.invoice.updateMany({ where: { id }, data: { portalVisible: visible } });
    else await db.ticket.updateMany({ where: { id }, data: { portalVisible: visible } });
    return { ok: true };
  }

  /** Let a signed-in client rotate their own password. */
  async changePassword(portal: PortalPrincipal, currentPassword: string, newPassword: string) {
    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    const db = this.prisma.forTenant(portal.organizationId);
    const contact = await db.contact.findFirst({ where: { id: portal.contactId, deletedAt: null } });
    if (!contact?.portalPasswordHash) throw new UnauthorizedException('Portal account not found');

    const ok = await verifyPassword(currentPassword, contact.portalPasswordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    await db.contact.update({
      where: { id: contact.id },
      data: { portalPasswordHash: await hashPassword(newPassword) },
    });
    return { ok: true };
  }
}
