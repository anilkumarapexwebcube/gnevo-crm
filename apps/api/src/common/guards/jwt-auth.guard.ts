import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AccessTokenPayloadSchema, type AuthUser } from '@gnevo/types';
import type { Env } from '../../config/config.schema.js';
import type { AuthedRequest } from '../types.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service.js';

/**
 * Verifies the Bearer access token, then populates `req.user` with the
 * authenticated principal (including its tenant `organizationId` and roles).
 * The tenant is taken from the token — never from client input.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    private readonly apiKeys: ApiKeysService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;

    // API key auth: `X-API-Key: gnevo_sk_...` or `Authorization: Bearer gnevo_sk_...`.
    const rawKey =
      (req.headers['x-api-key'] as string | undefined) ??
      (header?.startsWith('Bearer gnevo_sk_') ? header.slice('Bearer '.length) : undefined);
    if (rawKey) {
      const auth = await this.apiKeys.authenticate(rawKey);
      if (!auth) throw new UnauthorizedException('Invalid API key');
      req.user = {
        id: auth.keyId,
        organizationId: auth.organizationId,
        email: '',
        fullName: 'API key',
        roles: ['api'],
        mfaEnabled: false,
      };
      return true;
    }

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length);

    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const parsed = AccessTokenPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new UnauthorizedException('Malformed token');
    }

    // Server-side session check: a revoked/expired session invalidates the
    // access token immediately, so "revoke device" and "sign out everywhere"
    // actually log that device out on its next request.
    if (parsed.data.sid) {
      const session = await this.prisma.session.findUnique({
        where: { id: parsed.data.sid },
        select: { revokedAt: true, expiresAt: true },
      });
      if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
        throw new UnauthorizedException('Session expired or revoked');
      }
    }

    // Load the live user so role changes, suspend, and delete take effect
    // immediately — the token's baked-in roles can be stale (e.g. after an
    // ownership transfer), so we never trust them for authorization.
    const dbUser = await this.prisma.user.findFirst({
      where: { id: parsed.data.sub, organizationId: parsed.data.org },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        deletedAt: true,
        mfaEnabled: true,
        roles: { select: { role: { select: { key: true } } } },
      },
    });
    if (!dbUser || dbUser.deletedAt || dbUser.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    const user: AuthUser = {
      id: dbUser.id,
      organizationId: parsed.data.org,
      email: dbUser.email,
      fullName: dbUser.fullName,
      roles: dbUser.roles.map((r) => r.role.key),
      mfaEnabled: dbUser.mfaEnabled,
    };
    req.user = user;
    req.sessionId = parsed.data.sid;
    return true;
  }
}
