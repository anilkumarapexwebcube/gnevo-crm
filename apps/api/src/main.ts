import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { Env } from './config/config.schema.js';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter.js';

// NOTE: the Express platform is used for the skeleton for reliability. Per
// docs/13-performance-checklist.md the target is the Fastify adapter; the swap
// is isolated to this bootstrap file + the platform dependency.
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService<Env, true>);

  // Raise the JSON body limit so base64 file uploads (up to ~8 MB → ~11 MB
  // encoded) are accepted; the default 100 kb rejects them with 413.
  app.useBodyParser('json', { limit: '12mb' });
  app.useBodyParser('urlencoded', { limit: '12mb', extended: true });

  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('v1', { exclude: ['health', 'health/live', 'health/ready'] });
  // Validation is done per-handler with Zod (ZodValidationPipe) — no
  // class-validator dependency needed.
  app.useGlobalFilters(new ProblemDetailsFilter());

  const origins = config.get('CORS_ORIGINS', { infer: true }).split(',');
  app.enableCors({ origin: origins, credentials: true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Gnevo CRM API')
    .setDescription('Enterprise CRM for digital marketing & SEO agencies')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = config.get('API_PORT', { infer: true });
  await app.listen(port);
  Logger.log(`🚀 API ready on http://localhost:${port} (docs at /docs)`, 'Bootstrap');
}

void bootstrap();
