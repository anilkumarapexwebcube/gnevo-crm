import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  CreateKeywordRequestSchema,
  CreateSeoProjectRequestSchema,
  UpdateKeywordRequestSchema,
  type AuthUser,
  type CreateKeywordRequest,
  type CreateSeoProjectRequest,
  type UpdateKeywordRequest,
} from '@gnevo/types';
import { SeoService } from './seo.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const AddCompetitorSchema = z.object({
  seoProjectId: z.string().uuid(),
  name: z.string().min(1).max(160),
  url: z.string().min(1).max(300),
  notes: z.string().max(1000).optional(),
});
const AuditSchema = z.object({ url: z.string().min(1).max(500) });

@ApiTags('seo')
@ApiBearerAuth()
@Controller('seo')
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Get('projects')
  @RequirePermissions({ resource: 'seo_project', action: 'view' })
  list(@CurrentUser() user: AuthUser) {
    return this.seo.list(user.organizationId);
  }

  @Get('projects/:id')
  @RequirePermissions({ resource: 'seo_project', action: 'view' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.seo.get(user.organizationId, id);
  }

  @Post('projects')
  @RequirePermissions({ resource: 'seo_project', action: 'create' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateSeoProjectRequestSchema)) dto: CreateSeoProjectRequest,
  ) {
    return this.seo.create(user.organizationId, dto);
  }

  @Delete('projects/:id')
  @RequirePermissions({ resource: 'seo_project', action: 'delete' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.seo.remove(user.organizationId, id);
  }

  @Get('projects/:id/connect')
  @RequirePermissions({ resource: 'seo_project', action: 'update' })
  connect(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.seo.connectUrl(user.organizationId, id);
  }

  @Post('projects/:id/sync')
  @RequirePermissions({ resource: 'seo_project', action: 'update' })
  sync(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.seo.sync(user.organizationId, id);
  }

  @Post('keywords')
  @RequirePermissions({ resource: 'seo_project', action: 'update' })
  addKeyword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateKeywordRequestSchema)) dto: CreateKeywordRequest,
  ) {
    return this.seo.addKeyword(user.organizationId, dto);
  }

  @Patch('keywords/:id')
  @RequirePermissions({ resource: 'seo_project', action: 'update' })
  updateKeyword(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateKeywordRequestSchema)) dto: UpdateKeywordRequest,
  ) {
    return this.seo.updateKeyword(user.organizationId, id, dto);
  }

  @Post('keywords/snapshot')
  @RequirePermissions({ resource: 'seo_project', action: 'update' })
  snapshotKeywords(@CurrentUser() user: AuthUser) {
    return this.seo.snapshotKeywords(user.organizationId);
  }

  @Get('keywords/:id/history')
  @RequirePermissions({ resource: 'seo_project', action: 'view' })
  keywordHistory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.seo.keywordHistory(user.organizationId, id);
  }

  @Delete('keywords/:id')
  @RequirePermissions({ resource: 'seo_project', action: 'update' })
  removeKeyword(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.seo.removeKeyword(user.organizationId, id);
  }

  // ── Competitors ──

  @Get('competitors')
  @RequirePermissions({ resource: 'seo_project', action: 'view' })
  listCompetitors(@CurrentUser() user: AuthUser, @Query('projectId') projectId: string) {
    return this.seo.listCompetitors(user.organizationId, projectId);
  }

  @Post('competitors')
  @RequirePermissions({ resource: 'seo_project', action: 'update' })
  addCompetitor(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(AddCompetitorSchema))
    dto: { seoProjectId: string; name: string; url: string; notes?: string },
  ) {
    return this.seo.addCompetitor(user.organizationId, dto);
  }

  @Delete('competitors/:id')
  @RequirePermissions({ resource: 'seo_project', action: 'update' })
  removeCompetitor(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.seo.removeCompetitor(user.organizationId, id);
  }

  // ── On-page audit ──

  @Post('audit')
  @RequirePermissions({ resource: 'seo_project', action: 'view' })
  audit(@Body(new ZodValidationPipe(AuditSchema)) dto: { url: string }) {
    return this.seo.auditUrl(dto.url);
  }
}
