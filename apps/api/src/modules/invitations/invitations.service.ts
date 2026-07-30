import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SYSTEM_ROLE_NAMES } from '@gnevo/auth';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Env } from '../../config/config.schema.js';
import { MailerService } from '../../common/mailer.service.js';
import { AuthService } from '../auth/auth.service.js';
import { AuditService } from '../events/audit.service.js';
import { NotificationsService } from '../events/notifications.service.js';

const INVITABLE_ROLES = ['admin', 'hr', 'manager', 'member', 'viewer'];
const TTL_DAYS = 7;

/** admin → owner only; hr → owner/admin; others → any inviter with user:manage. */
function assertCanInvite(actorRoles: string[], roleKey: string) {
  const isOwner = actorRoles.includes('owner');
  const isAdmin = actorRoles.includes('admin');
  if (roleKey === 'admin' && !isOwner) {
    throw new BadRequestException('Only the owner can invite an Admin');
  }
  if (roleKey === 'hr' && !(isOwner || isAdmin)) {
    throw new BadRequestException('Only the owner or an admin can invite an HR');
  }
}

interface CreateInput {
  email: string;
  roleKey?: string;
  departmentId?: string;
  teamId?: string;
}
interface RequestCtx {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly mailer: MailerService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private mask(inv: {
    id: string;
    email: string;
    roleKey: string;
    status: string;
    invitedByName: string | null;
    expiresAt: Date;
    createdAt: Date;
  }) {
    return {
      id: inv.id,
      email: inv.email,
      roleKey: inv.roleKey,
      roleName: SYSTEM_ROLE_NAMES[inv.roleKey as keyof typeof SYSTEM_ROLE_NAMES] ?? inv.roleKey,
      status: inv.status,
      invitedByName: inv.invitedByName,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      expired: inv.status === 'pending' && inv.expiresAt.getTime() < Date.now(),
    };
  }

  private async sign(invitationId: string, organizationId: string): Promise<string> {
    return this.jwt.signAsync(
      { invitationId, org: organizationId, type: 'invite' },
      { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }), expiresIn: `${TTL_DAYS}d` },
    );
  }

  private async email(orgName: string, to: string, roleKey: string, token: string) {
    const link = `${this.config.get('WEB_URL', { infer: true })}/invite/accept?token=${token}`;
    const roleName = SYSTEM_ROLE_NAMES[roleKey as keyof typeof SYSTEM_ROLE_NAMES] ?? roleKey;
    await this.mailer.send(
      to,
      `You're invited to join ${orgName} on Gnevo CRM`,
      `You've been invited to join ${orgName} as ${roleName}.\n\nAccept your invitation (valid ${TTL_DAYS} days):\n${link}\n\nIf you weren't expecting this, ignore this email.`,
      `<p>You've been invited to join <b>${orgName}</b> as <b>${roleName}</b>.</p><p><a href="${link}">Accept your invitation</a> (valid ${TTL_DAYS} days).</p>`,
    );
    if (!this.config.get('SMTP_HOST', { infer: true })) {
      // eslint-disable-next-line no-console
      console.log(`\n🔗 [dev] Invitation link for ${to}:\n${link}\n`);
    }
  }

  async list(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    const rows = await db.invitation.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    return rows.map((r) => this.mask(r));
  }

  async create(organizationId: string, invitedBy: { id: string; name: string; roles: string[] }, dto: CreateInput) {
    const email = dto.email.trim().toLowerCase();
    if (!email || !email.includes('@')) throw new BadRequestException('A valid email is required');
    const roleKey = dto.roleKey && INVITABLE_ROLES.includes(dto.roleKey) ? dto.roleKey : 'member';
    assertCanInvite(invitedBy.roles, roleKey);

    const db = this.prisma.forTenant(organizationId);
    const member = await db.user.findFirst({ where: { email, deletedAt: null }, select: { id: true } });
    if (member) throw new BadRequestException('That person is already a member of this workspace');
    const pending = await db.invitation.findFirst({ where: { email, status: 'pending' }, select: { id: true } });
    if (pending) throw new BadRequestException('An invitation is already pending for this email');

    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    const inv = await db.invitation.create({
      data: {
        organizationId,
        email,
        roleKey,
        departmentId: dto.departmentId ?? null,
        teamId: dto.teamId ?? null,
        invitedById: invitedBy.id,
        invitedByName: invitedBy.name,
        expiresAt: new Date(Date.now() + TTL_DAYS * 86_400_000),
      },
    });
    const token = await this.sign(inv.id, organizationId);
    await this.email(org?.name ?? 'the workspace', email, roleKey, token);
    await this.audit.record(organizationId, { actorId: invitedBy.id, action: 'invite.created', resource: 'user', resourceId: inv.id, after: { email, roleKey } });
    return this.mask(inv);
  }

  async bulk(organizationId: string, invitedBy: { id: string; name: string; roles: string[] }, emails: string[], roleKey?: string) {
    let created = 0;
    const skipped: string[] = [];
    for (const raw of emails) {
      try {
        await this.create(organizationId, invitedBy, { email: raw, roleKey });
        created += 1;
      } catch {
        skipped.push(raw.trim());
      }
    }
    return { created, skipped };
  }

  async resend(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const inv = await db.invitation.findFirst({ where: { id } });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.status !== 'pending') throw new BadRequestException('Only pending invitations can be resent');
    const updated = await db.invitation.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() + TTL_DAYS * 86_400_000) },
    });
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    const token = await this.sign(inv.id, organizationId);
    await this.email(org?.name ?? 'the workspace', inv.email, inv.roleKey, token);
    return this.mask(updated);
  }

  async cancel(organizationId: string, id: string, actorId: string) {
    const db = this.prisma.forTenant(organizationId);
    const inv = await db.invitation.findFirst({ where: { id } });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.status !== 'pending') throw new BadRequestException('Only pending invitations can be cancelled');
    await db.invitation.update({ where: { id }, data: { status: 'cancelled' } });
    await this.audit.record(organizationId, { actorId, action: 'invite.cancelled', resource: 'user', resourceId: id });
    return { ok: true };
  }

  /** Public: validate a token for the accept page. */
  async verify(token: string) {
    let payload: { invitationId?: string; org?: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }) });
    } catch {
      return { valid: false as const, reason: 'This invitation link is invalid or has expired.' };
    }
    if (payload.type !== 'invite' || !payload.invitationId || !payload.org) {
      return { valid: false as const, reason: 'This invitation link is invalid.' };
    }
    const inv = await this.prisma.invitation.findUnique({ where: { id: payload.invitationId } });
    if (!inv || inv.status !== 'pending') return { valid: false as const, reason: 'This invitation is no longer active.' };
    if (inv.expiresAt.getTime() < Date.now()) return { valid: false as const, reason: 'This invitation has expired.' };
    const org = await this.prisma.organization.findUnique({ where: { id: inv.organizationId }, select: { name: true } });
    return {
      valid: true as const,
      email: inv.email,
      orgName: org?.name ?? 'the workspace',
      roleName: SYSTEM_ROLE_NAMES[inv.roleKey as keyof typeof SYSTEM_ROLE_NAMES] ?? inv.roleKey,
    };
  }

  /** Public: accept an invitation → create the user + sign them in. */
  async accept(token: string, fullName: string, password: string, ctx: RequestCtx) {
    let payload: { invitationId?: string; org?: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }) });
    } catch {
      throw new BadRequestException('This invitation link is invalid or has expired');
    }
    if (payload.type !== 'invite' || !payload.invitationId) throw new BadRequestException('Invalid invitation');
    const inv = await this.prisma.invitation.findUnique({ where: { id: payload.invitationId } });
    if (!inv || inv.status !== 'pending') throw new BadRequestException('This invitation is no longer active');
    if (inv.expiresAt.getTime() < Date.now()) throw new BadRequestException('This invitation has expired');

    const result = await this.auth.createInvitedUser(
      inv.organizationId,
      {
        email: inv.email,
        fullName,
        password,
        roleKey: inv.roleKey,
        departmentId: inv.departmentId,
        teamId: inv.teamId,
      },
      ctx,
    );
    await this.prisma.invitation.update({ where: { id: inv.id }, data: { status: 'accepted', acceptedAt: new Date() } });
    await this.audit.record(inv.organizationId, { actorId: result.user.id, action: 'invite.accepted', resource: 'user', resourceId: result.user.id, after: { email: inv.email } });
    if (inv.invitedById) {
      await this.notifications.notify(inv.organizationId, inv.invitedById, {
        title: `${fullName} joined the workspace`,
        body: `${inv.email} accepted your invitation.`,
        link: '/directory',
        type: 'team',
      });
    }
    return result;
  }
}
