import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { PortalPrincipal, PortalRequest } from '../guards/portal-auth.guard.js';

/** Injects the authenticated client-portal principal into a handler param. */
export const PortalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PortalPrincipal => {
    const req = ctx.switchToHttp().getRequest<PortalRequest>();
    return req.portal;
  },
);
