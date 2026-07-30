import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { FilesService } from './files.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const UploadSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().max(150).optional(),
  dataBase64: z.string().min(1),
  entityType: z.string().max(40).optional(),
  entityId: z.string().uuid().optional(),
});

const VersionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  mimeType: z.string().max(150).optional(),
  dataBase64: z.string().min(1),
});

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  upload(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(UploadSchema))
    dto: {
      name: string;
      mimeType?: string;
      dataBase64: string;
      entityType?: string;
      entityId?: string;
    },
  ) {
    return this.files.upload(user.organizationId, { id: user.id, name: user.fullName }, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.files.list(user.organizationId, entityType, entityId);
  }

  @Get(':id/versions')
  versions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.files.versions(user.organizationId, id);
  }

  @Get(':id/preview-html')
  previewHtml(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.files.previewHtml(user.organizationId, id);
  }

  @Post(':id/version')
  uploadVersion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(VersionSchema))
    dto: { name?: string; mimeType?: string; dataBase64: string },
  ) {
    return this.files.uploadVersion(user.organizationId, { id: user.id, name: user.fullName }, id, dto);
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('inline') inline: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.files.download(user.organizationId, id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(file.name)}"`,
    );
    res.send(Buffer.from(file.data));
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.files.remove(user.organizationId, id, user.id);
  }
}
