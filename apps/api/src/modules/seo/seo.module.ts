import { Module } from '@nestjs/common';
import { SeoController } from './seo.controller.js';
import { IntegrationsController } from './integrations.controller.js';
import { SeoService } from './seo.service.js';

@Module({
  controllers: [SeoController, IntegrationsController],
  providers: [SeoService],
})
export class SeoModule {}
