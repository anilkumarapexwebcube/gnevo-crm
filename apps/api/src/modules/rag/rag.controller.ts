import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@gnevo/types';
import { RagService } from './rag.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('rag')
@Controller('rag')
export class RagController {
  constructor(private readonly rag: RagService) {}

  @Get('search')
  search(
    @CurrentUser() user: AuthUser,
    @Query('q') q = '',
    @Query('limit') limit?: string,
  ) {
    return this.rag.search(user.organizationId, q, limit ? Math.min(Number(limit) || 8, 25) : 8);
  }

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.rag.status(user.organizationId);
  }

  @Post('reindex')
  reindex(@CurrentUser() user: AuthUser) {
    return this.rag.reindex(user.organizationId);
  }
}
