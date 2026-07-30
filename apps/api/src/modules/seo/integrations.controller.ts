import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SeoService } from './seo.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { Env } from '../../config/config.schema.js';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly seo: SeoService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Google OAuth callback (browser redirect from Google — no auth header). */
  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    const webUrl = this.config.get('WEB_URL', { infer: true });
    if (!code || !state) {
      res.redirect(`${webUrl}/seo?connected=0`);
      return;
    }
    try {
      const redirectTo = await this.seo.handleGoogleCallback(code, state);
      res.redirect(redirectTo);
    } catch {
      res.redirect(`${webUrl}/seo?connected=0`);
    }
  }
}
