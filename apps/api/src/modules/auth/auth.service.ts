import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as nodemailer from 'nodemailer';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hashPassword, verifyPassword, SYSTEM_ROLE_NAMES, SYSTEM_ROLE_TEMPLATES } from '@gnevo/auth';
import { ensureSystemRole } from '../../common/ensure-role.js';
import {
  type AuthTokens,
  type AuthUser,
  type LoginRequest,
  type RegisterRequest,
  type SystemRole,
} from '@gnevo/types';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../events/audit.service.js';
import { NotificationsService } from '../events/notifications.service.js';
import type { Env } from '../../config/config.schema.js';

export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Signs up a new organization with an owner user + seeded roles. */
  async register(dto: RegisterRequest): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    let slug = slugify(dto.organizationName);
    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const passwordHash = await hashPassword(dto.password);

    const { user } = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: dto.organizationName, slug, plan: 'trial' },
      });

      // Ensure the permissions referenced by role templates exist.
      const pairs = new Set<string>();
      for (const tpls of Object.values(SYSTEM_ROLE_TEMPLATES)) {
        for (const t of tpls) pairs.add(`${t.resource}:${t.action}`);
      }
      for (const pair of pairs) {
        const [resource, action] = pair.split(':');
        await tx.permission.upsert({
          where: { resource_action: { resource: resource!, action: action! } },
          update: {},
          create: { resource: resource!, action: action! },
        });
      }
      const permissions = await tx.permission.findMany();
      const permId = (r: string, a: string) =>
        permissions.find((p) => p.resource === r && p.action === a)!.id;

      // Seed org roles from templates.
      let ownerRoleId = '';
      for (const key of Object.keys(SYSTEM_ROLE_TEMPLATES) as SystemRole[]) {
        const role = await tx.role.create({
          data: {
            organizationId: org.id,
            key,
            name: SYSTEM_ROLE_NAMES[key],
            isSystem: true,
            permissions: {
              create: SYSTEM_ROLE_TEMPLATES[key].map((t) => ({
                permissionId: permId(t.resource, t.action),
                scope: t.scope,
              })),
            },
          },
        });
        if (key === 'owner') ownerRoleId = role.id;
      }

      const createdUser = await tx.user.create({
        data: {
          organizationId: org.id,
          email: dto.email,
          fullName: dto.fullName,
          passwordHash,
          status: 'active',
          roles: { create: { roleId: ownerRoleId } },
        },
      });

      return { user: createdUser, orgId: org.id };
    });

    const authUser = await this.toAuthUser(user.id);
    const tokens = await this.issueTokens(authUser);
    return { user: authUser, tokens };
  }

  /** Create a user inside an existing org from an accepted invitation. */
  async createInvitedUser(
    organizationId: string,
    dto: { email: string; fullName: string; password: string; roleKey: string; departmentId?: string | null; teamId?: string | null },
    ctx: RequestContext = {},
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const existing = await this.prisma.user.findFirst({
      where: { organizationId, email: dto.email, deletedAt: null },
      select: { id: true },
    });
    if (existing) throw new ConflictException('A user with this email already exists');

    const roleId = await ensureSystemRole(this.prisma, organizationId, dto.roleKey);

    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email: dto.email,
        fullName: dto.fullName,
        passwordHash,
        status: 'active',
        departmentId: dto.departmentId ?? null,
        roles: { create: { roleId } },
        ...(dto.teamId ? { teams: { create: { teamId: dto.teamId } } } : {}),
      },
      select: { id: true },
    });

    const authUser = await this.toAuthUser(user.id);
    const tokens = await this.issueTokens(authUser, ctx);
    return { user: authUser, tokens };
  }

  async login(
    dto: LoginRequest,
    ctx: RequestContext = {},
  ): Promise<
    | { user: AuthUser; tokens: AuthTokens }
    | { mfaRequired: true; mfaToken: string; methods: { totp: boolean; passkey: boolean } }
  > {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        deletedAt: null,
        ...(dto.organizationSlug
          ? { organization: { slug: dto.organizationSlug } }
          : {}),
      },
    });

    // Constant-ish work to reduce user enumeration signal.
    if (!user?.passwordHash) {
      await hashPassword(dto.password);
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await verifyPassword(dto.password, user.passwordHash);
    if (!ok) {
      await this.audit.record(user.organizationId, {
        actorId: user.id,
        action: 'auth.login_failed',
        resource: 'user',
        resourceId: user.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status !== 'active') throw new UnauthorizedException('Account is not active');

    // Two-factor gate: passkey and/or authenticator app.
    const passkeyCount = await this.prisma.passkey.count({ where: { userId: user.id } });
    const needsMfa = user.mfaEnabled || passkeyCount > 0;
    if (needsMfa) {
      if (dto.code && user.mfaEnabled) {
        // TOTP second factor supplied inline.
        if (!user.mfaSecret || !authenticator.check(dto.code.trim(), user.mfaSecret)) {
          await this.audit.record(user.organizationId, {
            actorId: user.id,
            action: 'auth.mfa_failed',
            resource: 'user',
            resourceId: user.id,
            ip: ctx.ip,
            userAgent: ctx.userAgent,
          });
          throw new UnauthorizedException('Invalid two-factor code');
        }
      } else {
        // Password verified — hand back a short-lived token to complete the
        // second factor (authenticator code or passkey), no session issued yet.
        const mfaToken = await this.jwt.signAsync(
          { sub: user.id, org: user.organizationId, type: 'mfa-pending' },
          { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }), expiresIn: '5m' },
        );
        return {
          mfaRequired: true,
          mfaToken,
          methods: { totp: user.mfaEnabled, passkey: passkeyCount > 0 },
        };
      }
    }

    const authUser = await this.toAuthUser(user.id);
    const tokens = await this.issueTokens(authUser, ctx);
    await this.audit.record(user.organizationId, {
      actorId: user.id,
      action: 'auth.login',
      resource: 'user',
      resourceId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    await this.notifications.notify(user.organizationId, user.id, {
      title: 'New sign-in to your account',
      body: `A new sign-in was detected${ctx.ip && ctx.ip !== '::1' && ctx.ip !== '127.0.0.1' ? ` from ${ctx.ip}` : ''}. If this wasn’t you, change your password.`,
      type: 'security',
    });
    return { user: authUser, tokens };
  }

  async me(userId: string): Promise<AuthUser> {
    return this.toAuthUser(userId);
  }

  /** The signed-in user's own recent sign-ins (from the audit log). */
  async myLoginHistory(organizationId: string, userId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { organizationId, actorId: userId, action: 'auth.login' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { ip: true, userAgent: true, createdAt: true },
    });
    return logs.map((l) => ({ ip: l.ip, userAgent: l.userAgent, at: l.createdAt }));
  }

  /** Update the signed-in user's own profile (name / email). */
  async updateProfile(
    userId: string,
    data: { fullName?: string; email?: string },
  ): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (data.email && data.email !== user.email) {
      const clash = await this.prisma.user.findFirst({
        where: {
          organizationId: user.organizationId,
          email: data.email,
          deletedAt: null,
          id: { not: userId },
        },
      });
      if (clash) throw new ConflictException('That email is already in use');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
      },
    });
    await this.audit.record(user.organizationId, {
      actorId: userId,
      action: 'auth.profile_updated',
      resource: 'user',
      resourceId: userId,
    });
    return this.toAuthUser(userId);
  }

  /** Change the signed-in user's own password. */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ ok: true }> {
    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) throw new UnauthorizedException('No password set for this account');

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    await this.audit.record(user.organizationId, {
      actorId: userId,
      action: 'auth.password_changed',
      resource: 'user',
      resourceId: userId,
    });
    await this.notifications.notify(user.organizationId, userId, {
      title: 'Password changed',
      body: 'Your account password was changed. If this wasn’t you, contact your admin immediately.',
      type: 'security',
    });
    return { ok: true };
  }

  /** Begin 2FA enrollment: generate a secret + QR. Not active until verified. */
  async setupTwoFactor(
    userId: string,
  ): Promise<{ qr: string; secret: string; otpauthUri: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
    const otpauthUri = authenticator.keyuri(user.email, 'Gnevo CRM', secret);
    const qr = await QRCode.toDataURL(otpauthUri);
    return { qr, secret, otpauthUri };
  }

  /** Verify the first code and switch 2FA on. */
  async enableTwoFactor(userId: string, code: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecret) throw new BadRequestException('Start 2FA setup first');
    if (!authenticator.check(code.trim(), user.mfaSecret)) {
      throw new UnauthorizedException('Invalid code — try the current one from your app');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    await this.audit.record(user.organizationId, {
      actorId: userId,
      action: '2fa.enabled',
      resource: 'user',
      resourceId: userId,
    });
    return { ok: true };
  }

  /** Turn 2FA off (requires a valid current code). */
  async disableTwoFactor(userId: string, code: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaEnabled || !user.mfaSecret) throw new BadRequestException('2FA is not enabled');
    if (!authenticator.check(code.trim(), user.mfaSecret)) {
      throw new UnauthorizedException('Invalid code');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    await this.audit.record(user.organizationId, {
      actorId: userId,
      action: '2fa.disabled',
      resource: 'user',
      resourceId: userId,
    });
    return { ok: true };
  }

  private async toAuthUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    // Flatten the user's effective permissions (resource:action) across all
    // their roles — the UI uses this to hide nav/actions the user can't access.
    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`),
        ),
      ),
    ];
    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles.map((r) => r.role.key),
      permissions,
      mfaEnabled: user.mfaEnabled,
    };
  }

  private async issueTokens(user: AuthUser, ctx: RequestContext = {}): Promise<AuthTokens> {
    const accessTtl = this.config.get('JWT_ACCESS_TTL', { infer: true });
    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true });

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, org: user.organizationId, type: 'refresh' },
      {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn: refreshTtl,
      },
    );

    // Persist the session FIRST so its id can be embedded in the access token —
    // this is what makes revocation actually log a device out (the guard
    // rejects any access token whose session has been revoked).
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: createHash('sha256').update(refreshToken).digest('hex'),
        userAgent: ctx.userAgent ?? null,
        ip: ctx.ip ?? null,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, org: user.organizationId, roles: user.roles, type: 'access', sid: session.id },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: accessTtl,
      },
    );

    return { accessToken, refreshToken, expiresIn: accessTtl };
  }

  // ─────────────── WebAuthn passkeys ───────────────

  private rpID(): string {
    return this.config.get('WEBAUTHN_RP_ID', { infer: true });
  }
  /** All origins a passkey ceremony may legitimately come from. */
  private allowedOrigins(): string[] {
    const set = new Set<string>([
      this.config.get('WEBAUTHN_ORIGIN', { infer: true }),
      this.config.get('WEB_URL', { infer: true }),
      ...this.config.get('CORS_ORIGINS', { infer: true }).split(',').map((s) => s.trim()),
    ]);
    return [...set].filter(Boolean);
  }

  /** Step 1 of registration: options + a signed challenge to echo back. */
  async passkeyRegisterOptions(userId: string): Promise<{ options: unknown; state: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const existing = await this.prisma.passkey.findMany({ where: { userId } });
    const options = await generateRegistrationOptions({
      rpName: 'Gnevo CRM',
      rpID: this.rpID(),
      userName: user.email,
      userID: new TextEncoder().encode(user.id),
      attestationType: 'none',
      excludeCredentials: existing.map((p) => ({
        id: p.credentialId,
        transports: (p.transports?.split(',').filter(Boolean) ?? []) as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    });
    const state = await this.jwt.signAsync(
      { sub: userId, ch: options.challenge, type: 'webauthn-reg' },
      { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }), expiresIn: '5m' },
    );
    return { options, state };
  }

  /** Step 2 of registration: verify the attestation and store the passkey. */
  async passkeyRegisterVerify(
    userId: string,
    response: Record<string, unknown>,
    state: string,
    name?: string,
  ): Promise<{ ok: true }> {
    let payload: { sub?: string; ch?: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(state, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      throw new BadRequestException('Registration session expired — try again');
    }
    if (payload.type !== 'webauthn-reg' || payload.sub !== userId || !payload.ch) {
      throw new BadRequestException('Invalid registration session');
    }
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: response as never,
        expectedChallenge: payload.ch,
        expectedOrigin: this.allowedOrigins(),
        expectedRPID: this.rpID(),
      });
    } catch (e) {
      throw new BadRequestException(`Passkey could not be verified: ${(e as Error).message}`);
    }
    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Passkey could not be verified');
    }
    const cred = verification.registrationInfo.credential;
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.prisma.passkey.create({
      data: {
        organizationId: user.organizationId,
        userId,
        credentialId: cred.id,
        publicKey: Buffer.from(cred.publicKey),
        counter: cred.counter,
        transports: (cred.transports ?? []).join(','),
        name: name?.trim() || 'Passkey',
      },
    });
    await this.audit.record(user.organizationId, {
      actorId: userId,
      action: 'passkey.registered',
      resource: 'user',
      resourceId: userId,
    });
    return { ok: true };
  }

  /** Resolve the user id from a short-lived mfa-pending token (password proof). */
  private async userIdFromMfaToken(mfaToken: string): Promise<string> {
    let payload: { sub?: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(mfaToken, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Sign-in session expired — start again');
    }
    if (payload.type !== 'mfa-pending' || !payload.sub) {
      throw new UnauthorizedException('Invalid sign-in session');
    }
    return payload.sub;
  }

  /** Passkey as a SECOND factor: options after the password step. */
  async passkey2faOptions(mfaToken: string): Promise<{ options: unknown; state: string }> {
    const userId = await this.userIdFromMfaToken(mfaToken);
    const passkeys = await this.prisma.passkey.findMany({ where: { userId } });
    if (passkeys.length === 0) throw new UnauthorizedException('No passkeys on this account');
    const options = await generateAuthenticationOptions({
      rpID: this.rpID(),
      userVerification: 'preferred',
      allowCredentials: passkeys.map((p) => ({
        id: p.credentialId,
        transports: (p.transports?.split(',').filter(Boolean) ?? []) as AuthenticatorTransportFuture[],
      })),
    });
    const state = await this.jwt.signAsync(
      { sub: userId, ch: options.challenge, type: 'webauthn-2fa' },
      { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }), expiresIn: '5m' },
    );
    return { options, state };
  }

  async passkey2faVerify(
    mfaToken: string,
    response: { id?: string } & Record<string, unknown>,
    state: string,
    ctx: RequestContext = {},
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const userId = await this.userIdFromMfaToken(mfaToken);
    let payload: { sub?: string; ch?: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(state, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Sign-in session expired — start again');
    }
    if (payload.type !== 'webauthn-2fa' || payload.sub !== userId || !payload.ch) {
      throw new UnauthorizedException('Invalid sign-in session');
    }
    const passkey = await this.prisma.passkey.findFirst({
      where: { credentialId: String(response.id), userId },
    });
    if (!passkey) throw new UnauthorizedException('Passkey not recognised');

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: response as never,
        expectedChallenge: payload.ch,
        expectedOrigin: this.allowedOrigins(),
        expectedRPID: this.rpID(),
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(passkey.publicKey),
          counter: passkey.counter,
          transports: (passkey.transports?.split(',').filter(Boolean) ?? []) as AuthenticatorTransportFuture[],
        },
      });
    } catch (e) {
      throw new UnauthorizedException(`Passkey verification failed: ${(e as Error).message}`);
    }
    if (!verification.verified) throw new UnauthorizedException('Passkey verification failed');

    await this.prisma.passkey.update({
      where: { id: passkey.id },
      data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
    });

    const authUser = await this.toAuthUser(userId);
    const tokens = await this.issueTokens(authUser, ctx);
    await this.audit.record(authUser.organizationId, {
      actorId: authUser.id,
      action: 'auth.passkey_2fa',
      resource: 'user',
      resourceId: authUser.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { user: authUser, tokens };
  }

  async listPasskeys(userId: string) {
    return this.prisma.passkey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    });
  }

  async removePasskey(userId: string, id: string): Promise<{ ok: true }> {
    await this.prisma.passkey.deleteMany({ where: { id, userId } });
    return { ok: true };
  }

  // ─────────────── Magic link (passwordless email) ───────────────

  private async sendEmail(to: string, subject: string, text: string): Promise<boolean> {
    const host = this.config.get('SMTP_HOST', { infer: true });
    if (!host) return false;
    try {
      const transport = nodemailer.createTransport({
        host,
        port: this.config.get('SMTP_PORT', { infer: true }) ?? 587,
        secure: (this.config.get('SMTP_PORT', { infer: true }) ?? 587) === 465,
        auth: this.config.get('SMTP_USER', { infer: true })
          ? {
              user: this.config.get('SMTP_USER', { infer: true }),
              pass: this.config.get('SMTP_PASS', { infer: true }),
            }
          : undefined,
      });
      await transport.sendMail({
        from:
          this.config.get('SMTP_FROM', { infer: true }) ??
          this.config.get('SMTP_USER', { infer: true }) ??
          'no-reply@gnevo.crm',
        to,
        subject,
        text,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send a one-time sign-in link. Always returns ok (no user enumeration). If
   * SMTP isn't configured, in non-production the link is returned for testing.
   */
  async requestMagicLink(email: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (user && user.status === 'active') {
      const token = await this.jwt.signAsync(
        { sub: user.id, org: user.organizationId, type: 'magic' },
        { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }), expiresIn: '15m' },
      );
      const link = `${this.config.get('WEB_URL', { infer: true })}/auth/magic?token=${token}`;
      const sent = await this.sendEmail(
        user.email,
        'Your Gnevo CRM sign-in link',
        `Click to sign in (valid 15 minutes):\n\n${link}\n\nIf you didn't request this, ignore this email.`,
      );
      // Without SMTP in dev, log the link to the SERVER console only — never
      // return it in the HTTP response (that would leak a valid credential).
      if (!sent && this.config.get('NODE_ENV', { infer: true }) !== 'production') {
        // eslint-disable-next-line no-console
        console.log(`\n🔗 [dev] Magic sign-in link for ${email}:\n${link}\n`);
      }
    }
    // Uniform response — never reveals whether the account exists.
    return { ok: true };
  }

  /** Send a password-reset link (uniform response; dev logs to server console). */
  async requestPasswordReset(email: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (user && user.status === 'active') {
      const token = await this.jwt.signAsync(
        { sub: user.id, org: user.organizationId, type: 'reset' },
        { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }), expiresIn: '15m' },
      );
      const link = `${this.config.get('WEB_URL', { infer: true })}/auth/reset?token=${token}`;
      const sent = await this.sendEmail(
        user.email,
        'Reset your Gnevo CRM password',
        `Reset your password (valid 15 minutes):\n\n${link}\n\nIf you didn't request this, ignore this email — your password is unchanged.`,
      );
      if (!sent && this.config.get('NODE_ENV', { infer: true }) !== 'production') {
        // eslint-disable-next-line no-console
        console.log(`\n🔑 [dev] Password reset link for ${email}:\n${link}\n`);
      }
    }
    return { ok: true };
  }

  /** Complete a password reset; also revokes existing sessions for safety. */
  async resetPassword(token: string, newPassword: string): Promise<{ ok: true }> {
    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    let payload: { sub?: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('This reset link is invalid or has expired');
    }
    if (payload.type !== 'reset' || !payload.sub) {
      throw new UnauthorizedException('Invalid reset link');
    }
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });
    if (!user || user.status !== 'active') throw new UnauthorizedException('Account is not available');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    // Kill all existing sessions — a reset should log every device out.
    await this.prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.record(user.organizationId, {
      actorId: user.id,
      action: 'auth.password_reset',
      resource: 'user',
      resourceId: user.id,
    });
    return { ok: true };
  }

  async verifyMagicLink(
    token: string,
    ctx: RequestContext = {},
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    let payload: { sub?: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('This sign-in link is invalid or has expired');
    }
    if (payload.type !== 'magic' || !payload.sub) {
      throw new UnauthorizedException('Invalid sign-in link');
    }
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Account is not available');
    }
    const authUser = await this.toAuthUser(user.id);
    const tokens = await this.issueTokens(authUser, ctx);
    await this.audit.record(user.organizationId, {
      actorId: user.id,
      action: 'auth.magic_login',
      resource: 'user',
      resourceId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { user: authUser, tokens };
  }

  /** Active login sessions for the current user (device/IP/time). */
  async listSessions(userId: string, currentSid?: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
    });
    // Current session first, then most recent.
    return sessions
      .map((s) => ({ ...s, current: s.id === currentSid }))
      .sort((a, b) => (a.current === b.current ? 0 : a.current ? -1 : 1));
  }

  /** Revoke a single session (invalidates its refresh token). */
  async revokeSession(userId: string, id: string): Promise<{ ok: true }> {
    await this.prisma.session.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  /** Revoke every session for the user ("sign out everywhere"). */
  async revokeAllSessions(userId: string): Promise<{ ok: true }> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.record(
      (await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })).organizationId,
      { actorId: userId, action: 'auth.sessions_revoked_all', resource: 'user', resourceId: userId },
    );
    return { ok: true };
  }
}
