import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@gnevo/types';
import type { AuthedRequest } from '../types.js';

/** Injects the authenticated principal into a handler param. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.user;
  },
);
