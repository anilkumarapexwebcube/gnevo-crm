import type { Request } from 'express';
import type { AuthUser } from '@gnevo/types';

/** Express request after JwtAuthGuard has populated the principal. */
export interface AuthedRequest extends Request {
  user: AuthUser;
  /** The current session id from the access token (for device management). */
  sessionId?: string;
}
