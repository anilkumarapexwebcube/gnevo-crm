import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@gnevo/types';
import { AuditService } from './audit.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

const ADMIN_ROLES = new Set(['owner', 'admin']);

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  /** Audit trail — restricted to owner/admin roles (security-sensitive). */
  @Get()
  list(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    if (!user.roles.some((r) => ADMIN_ROLES.has(r))) {
      throw new ForbiddenException('Admin access required to view the audit log');
    }
    return this.audit.list(user.organizationId, limit ? Number(limit) : 100);
  }
}
