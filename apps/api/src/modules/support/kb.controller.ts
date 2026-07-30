import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreateArticleRequestSchema,
  UpdateArticleRequestSchema,
  type AuthUser,
  type CreateArticleRequest,
  type UpdateArticleRequest,
} from '@gnevo/types';
import { SupportService } from './support.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@ApiTags('kb')
@ApiBearerAuth()
@Controller('kb')
export class KbController {
  constructor(private readonly support: SupportService) {}

  @Get()
  @RequirePermissions({ resource: 'article', action: 'view' })
  list(@CurrentUser() user: AuthUser) {
    return this.support.listArticles(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions({ resource: 'article', action: 'view' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.support.getArticle(user.organizationId, id);
  }

  @Post()
  @RequirePermissions({ resource: 'article', action: 'create' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateArticleRequestSchema)) dto: CreateArticleRequest,
  ) {
    return this.support.createArticle(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions({ resource: 'article', action: 'update' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateArticleRequestSchema)) dto: UpdateArticleRequest,
  ) {
    return this.support.updateArticle(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'article', action: 'delete' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.support.removeArticle(user.organizationId, id);
  }
}
