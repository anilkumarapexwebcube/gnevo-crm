import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { PortalService } from './portal.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PortalUser } from '../../common/decorators/portal-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PortalAuthGuard, type PortalPrincipal } from '../../common/guards/portal-auth.guard.js';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

@ApiTags('portal')
@Controller('portal')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  // ─────────────── Agency side (staff) ───────────────

  /** List a customer's contacts + their portal-access status. */
  @Get('customers/:customerId/contacts')
  @RequirePermissions({ resource: 'customer', action: 'view' })
  listContacts(@CurrentUser() user: AuthUser, @Param('customerId') customerId: string) {
    return this.portal.listContacts(user.organizationId, customerId);
  }

  /** Enable portal access for a contact; returns a one-time temp password. */
  @Post('customers/:customerId/contacts/:contactId/enable')
  @RequirePermissions({ resource: 'customer', action: 'update' })
  enable(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.portal.enableContact(user.organizationId, customerId, contactId, user.id);
  }

  /** Revoke a contact's portal access. */
  @Post('customers/:customerId/contacts/:contactId/disable')
  @RequirePermissions({ resource: 'customer', action: 'update' })
  disable(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.portal.disableContact(user.organizationId, customerId, contactId, user.id);
  }

  /** Set a client's granular portal permissions. */
  @Post('customers/:customerId/contacts/:contactId/permissions')
  @RequirePermissions({ resource: 'customer', action: 'update' })
  setPermissions(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
    @Param('contactId') contactId: string,
    @Body(new ZodValidationPipe(z.object({ projects: z.boolean().optional(), invoices: z.boolean().optional(), tickets: z.boolean().optional() })))
    dto: { projects?: boolean; invoices?: boolean; tickets?: boolean },
  ) {
    return this.portal.setPermissions(user.organizationId, customerId, contactId, dto);
  }

  /** List a customer's projects/invoices/tickets with portal-visibility flags. */
  @Get('customers/:customerId/shareable')
  @RequirePermissions({ resource: 'customer', action: 'view' })
  shareable(@CurrentUser() user: AuthUser, @Param('customerId') customerId: string) {
    return this.portal.shareable(user.organizationId, customerId);
  }

  /** Show/hide a specific record in the client portal. */
  @Post('customers/:customerId/visibility')
  @RequirePermissions({ resource: 'customer', action: 'update' })
  setVisibility(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(z.object({ type: z.enum(['project', 'invoice', 'ticket']), id: z.string().uuid(), visible: z.boolean() })))
    dto: { type: 'project' | 'invoice' | 'ticket'; id: string; visible: boolean },
  ) {
    return this.portal.setVisibility(user.organizationId, dto.type, dto.id, dto.visible);
  }

  // ─────────────── Client side (portal login) ───────────────

  /** Public: client sign-in. Returns a portal session token. */
  @Public()
  @Post('auth/login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(LoginSchema)) dto: { email: string; password: string }) {
    return this.portal.login(dto.email, dto.password);
  }

  /** Client: own profile (requires a valid portal token). */
  @Public()
  @UseGuards(PortalAuthGuard)
  @Get('auth/me')
  me(@PortalUser() portal: PortalPrincipal) {
    return this.portal.me(portal);
  }

  /** Client: read-only data for their own customer. */
  @Public()
  @UseGuards(PortalAuthGuard)
  @Get('data')
  data(@PortalUser() portal: PortalPrincipal) {
    return this.portal.data(portal);
  }

  /** Client: update own profile (name / phone). */
  @Public()
  @UseGuards(PortalAuthGuard)
  @Post('profile')
  @HttpCode(200)
  updateProfile(
    @PortalUser() portal: PortalPrincipal,
    @Body(new ZodValidationPipe(z.object({ name: z.string().max(120).optional(), phone: z.string().max(40).optional() })))
    dto: { name?: string; phone?: string },
  ) {
    return this.portal.updateProfile(portal, dto);
  }

  /** Client: rotate own password. */
  @Public()
  @UseGuards(PortalAuthGuard)
  @Post('auth/change-password')
  @HttpCode(200)
  changePassword(
    @PortalUser() portal: PortalPrincipal,
    @Body(new ZodValidationPipe(ChangePasswordSchema))
    dto: { currentPassword: string; newPassword: string },
  ) {
    return this.portal.changePassword(portal, dto.currentPassword, dto.newPassword);
  }
}
