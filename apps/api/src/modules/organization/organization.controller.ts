import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { OrganizationService } from './organization.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const BrandingSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #6366f1')
    .optional(),
});

const CustomFieldsSchema = z.object({
  entity: z.string().min(1).max(40),
  fields: z
    .array(
      z.object({
        key: z
          .string()
          .min(1)
          .max(40)
          .regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers and underscores'),
        label: z.string().min(1).max(60),
        type: z.enum(['text', 'number', 'date', 'url']),
      }),
    )
    .max(30),
});

const AiPreferenceSchema = z.object({
  provider: z
    .enum(['groq', 'openrouter', 'openai', 'anthropic', 'gemini', 'deepseek', 'xai'])
    .nullable()
    .optional(),
  model: z.string().max(80).nullable().optional(),
});

const SavedViewSchema = z.object({
  entity: z.string().min(1).max(40),
  name: z.string().min(1).max(60),
  query: z.record(z.string()),
});

@ApiTags('organization')
@Controller('org')
export class OrganizationController {
  constructor(private readonly org: OrganizationService) {}

  /** Any authenticated user can read branding (needed to render the app shell). */
  @Get('branding')
  getBranding(@CurrentUser() user: AuthUser) {
    return this.org.getBranding(user.organizationId);
  }

  /** Only owner/admin can change branding. */
  @Patch('branding')
  updateBranding(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(BrandingSchema)) dto: { displayName?: string; brandColor?: string },
  ) {
    if (!user.roles.some((r) => r === 'owner' || r === 'admin')) {
      throw new ForbiddenException('Only owners and admins can change branding');
    }
    return this.org.updateBranding(user.organizationId, dto, user.id);
  }

  @Get('members')
  getMembers(@CurrentUser() user: AuthUser) {
    return this.org.getMembers(user.organizationId);
  }

  @Get('directory')
  getDirectory(@CurrentUser() user: AuthUser) {
    return this.org.getDirectory(user.organizationId);
  }

  // ── Custom fields ──

  @Get('custom-fields')
  getCustomFields(@CurrentUser() user: AuthUser, @Query('entity') entity = 'customer') {
    return this.org.getCustomFields(user.organizationId, entity);
  }

  @Patch('custom-fields')
  updateCustomFields(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CustomFieldsSchema))
    dto: { entity: string; fields: { key: string; label: string; type: 'text' | 'number' | 'date' | 'url' }[] },
  ) {
    if (!user.roles.some((r) => r === 'owner' || r === 'admin')) {
      throw new ForbiddenException('Only owners and admins can edit custom fields');
    }
    return this.org.updateCustomFields(user.organizationId, dto.entity, dto.fields, user.id);
  }

  // ── AI preferences ──

  @Get('ai-preferences')
  getAiPreference(@CurrentUser() user: AuthUser) {
    return this.org.getAiPreference(user.organizationId);
  }

  @Patch('ai-preferences')
  updateAiPreference(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(AiPreferenceSchema))
    dto: { provider?: string | null; model?: string | null },
  ) {
    if (!user.roles.some((r) => r === 'owner' || r === 'admin')) {
      throw new ForbiddenException('Only owners and admins can change AI preferences');
    }
    return this.org.updateAiPreference(user.organizationId, dto, user.id);
  }

  // ── Ticket macros ──

  @Get('ticket-macros')
  getTicketMacros(@CurrentUser() user: AuthUser) {
    return this.org.getTicketMacros(user.organizationId);
  }

  @Patch('ticket-macros')
  setTicketMacros(
    @CurrentUser() user: AuthUser,
    @Body(
      new ZodValidationPipe(
        z.object({
          macros: z
            .array(z.object({ title: z.string().min(1).max(80), body: z.string().min(1).max(4000) }))
            .max(50),
        }),
      ),
    )
    dto: { macros: { title: string; body: string }[] },
  ) {
    if (!user.roles.some((r) => r === 'owner' || r === 'admin')) {
      throw new ForbiddenException('Only owners and admins can edit macros');
    }
    return this.org.setTicketMacros(user.organizationId, dto.macros, user.id);
  }

  // ── Scheduled reports ──

  @Get('scheduled-reports')
  getScheduledReports(@CurrentUser() user: AuthUser) {
    return this.org.getScheduledReports(user.organizationId);
  }

  @Patch('scheduled-reports')
  setScheduledReports(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(z.object({ enabled: z.boolean() }))) dto: { enabled: boolean },
  ) {
    if (!user.roles.some((r) => r === 'owner' || r === 'admin')) {
      throw new ForbiddenException('Only owners and admins can change this');
    }
    return this.org.setScheduledReports(user.organizationId, dto.enabled, user.id);
  }

  // ── Security (session idle timeout) ──

  @Get('security')
  getSecurity(@CurrentUser() user: AuthUser) {
    return this.org.getSecurity(user.organizationId);
  }

  @Patch('security')
  setSecurity(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(z.object({ idleTimeoutMinutes: z.number().int().min(0).max(480) }))) dto: { idleTimeoutMinutes: number },
  ) {
    if (!user.roles.some((r) => r === 'owner' || r === 'admin')) {
      throw new ForbiddenException('Only owners and admins can change this');
    }
    return this.org.setSecurity(user.organizationId, dto.idleTimeoutMinutes, user.id);
  }

  // ── Saved views ──

  @Get('saved-views')
  getSavedViews(@CurrentUser() user: AuthUser, @Query('entity') entity = 'leads') {
    return this.org.getSavedViews(user.organizationId, entity);
  }

  @Post('saved-views')
  addSavedView(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(SavedViewSchema))
    dto: { entity: string; name: string; query: Record<string, string> },
  ) {
    return this.org.addSavedView(user.organizationId, dto.entity, {
      name: dto.name,
      query: dto.query,
    });
  }

  @Delete('saved-views/:entity/:id')
  removeSavedView(
    @CurrentUser() user: AuthUser,
    @Param('entity') entity: string,
    @Param('id') id: string,
  ) {
    return this.org.removeSavedView(user.organizationId, entity, id);
  }
}
