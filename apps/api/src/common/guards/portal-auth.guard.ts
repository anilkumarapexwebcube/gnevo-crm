import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../../config/config.schema.js';

export interface PortalPrincipal {
  contactId: string;
  organizationId: string;
  customerId: string;
}

export interface PortalRequest extends Request {
  portal: PortalPrincipal;
}

/**
 * Verifies a client-portal Bearer token and populates `req.portal`.
 * The portal token is a *separate* credential from the staff access token:
 * it carries `type: 'portal'` and is bound to one contact + customer, so a
 * signed-in client can only ever reach their own customer's data.
 *
 * Portal routes are also marked `@Public()` so the global staff JwtAuthGuard
 * skips them; this guard is what actually authenticates the client.
 */
@Injectable()
export class PortalAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<PortalRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing portal token');
    }
    const token = header.slice('Bearer '.length);

    let payload: {
      sub?: string;
      org?: string;
      customerId?: string;
      type?: string;
    };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired portal session');
    }

    if (payload.type !== 'portal' || !payload.sub || !payload.org || !payload.customerId) {
      throw new UnauthorizedException('Invalid portal session');
    }

    req.portal = {
      contactId: payload.sub,
      organizationId: payload.org,
      customerId: payload.customerId,
    };
    return true;
  }
}
