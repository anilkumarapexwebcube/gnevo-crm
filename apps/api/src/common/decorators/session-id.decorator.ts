import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthedRequest } from '../types.js';

/** Injects the current session id (from the access token) into a handler param. */
export const SessionId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.sessionId;
  },
);
