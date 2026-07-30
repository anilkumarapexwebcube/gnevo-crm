import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { validateEnv } from './config/config.schema.js';
import { QueueModule } from './queue/queue.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { LeadsModule } from './modules/leads/leads.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { DealsModule } from './modules/deals/deals.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { AutomationsModule } from './modules/automations/automations.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { InvoicesModule } from './modules/invoices/invoices.module.js';
import { SeoModule } from './modules/seo/seo.module.js';
import { SupportModule } from './modules/support/support.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { PortalModule } from './modules/portal/portal.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { FilesModule } from './modules/files/files.module.js';
import { OrganizationModule } from './modules/organization/organization.module.js';
import { NotesModule } from './modules/notes/notes.module.js';
import { ApiKeysModule } from './modules/api-keys/api-keys.module.js';
import { TimeModule } from './modules/time/time.module.js';
import { MilestonesModule } from './modules/milestones/milestones.module.js';
import { ContentModule } from './modules/content/content.module.js';
import { WebhooksModule } from './modules/webhooks/webhooks.module.js';
import { MacrosModule } from './modules/macros/macros.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { CalendarModule } from './modules/calendar/calendar.module.js';
import { RagModule } from './modules/rag/rag.module.js';
import { IntegrationsWorkspaceModule } from './modules/integrations/integrations-workspace.module.js';
import { MailerModule } from './common/mailer.module.js';
import { InvitationsModule } from './modules/invitations/invitations.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { StructureModule } from './modules/structure/structure.module.js';
import { RolesModule } from './modules/roles/roles.module.js';
import { HrModule } from './modules/hr/hr.module.js';
import { HealthModule } from './health/health.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RbacGuard } from './common/guards/rbac.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      cache: true,
      // Single source of truth: the monorepo-root .env (cwd is apps/api).
      envFilePath: [resolve(process.cwd(), '../../.env'), '.env'],
    }),
    // Global JwtModule so the global JwtAuthGuard can inject JwtService.
    JwtModule.register({ global: true }),
    QueueModule,
    PrismaModule,
    RbacModule,
    AuthModule,
    LeadsModule,
    CustomersModule,
    DealsModule,
    ProjectsModule,
    AutomationsModule,
    AiModule,
    InvoicesModule,
    SeoModule,
    SupportModule,
    ReportsModule,
    SearchModule,
    PortalModule,
    EventsModule,
    FilesModule,
    OrganizationModule,
    NotesModule,
    ApiKeysModule,
    TimeModule,
    MilestonesModule,
    ContentModule,
    WebhooksModule,
    MacrosModule,
    ChatModule,
    CalendarModule,
    RagModule,
    IntegrationsWorkspaceModule,
    MailerModule,
    InvitationsModule,
    UsersModule,
    StructureModule,
    RolesModule,
    HrModule,
    HealthModule,
  ],
  providers: [
    // Global auth + RBAC. Routes opt out of auth with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RbacGuard },
  ],
})
export class AppModule {}
