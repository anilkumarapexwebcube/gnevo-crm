import { Injectable } from '@nestjs/common';
import type { Prisma } from '@gnevo/db';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../events/audit.service.js';

interface Branding {
  displayName?: string;
  brandColor?: string;
}

export interface CustomFieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'url';
}

export interface SavedView {
  id: string;
  name: string;
  query: Record<string, string>;
}

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getBranding(organizationId: string): Promise<{ displayName: string; brandColor: string | null }> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true, settings: true },
    });
    const branding = ((org.settings as Record<string, unknown>)?.branding ?? {}) as Branding;
    return {
      displayName: branding.displayName || org.name,
      brandColor: branding.brandColor || null,
    };
  }

  async updateBranding(
    organizationId: string,
    input: Branding,
    actorId?: string,
  ): Promise<{ displayName: string; brandColor: string | null }> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { settings: true },
    });
    const settings = ((org.settings as Record<string, unknown>) ?? {}) as Record<string, unknown>;
    const current = (settings.branding ?? {}) as Branding;
    settings.branding = {
      ...current,
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.brandColor !== undefined ? { brandColor: input.brandColor } : {}),
    };
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: settings as Prisma.InputJsonValue },
    });
    await this.audit.record(organizationId, {
      actorId,
      action: 'org.branding_updated',
      resource: 'organization',
      resourceId: organizationId,
    });
    return this.getBranding(organizationId);
  }

  /** Org members (for @mention pickers, owner/assignee selects, etc.). */
  async getMembers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId, deletedAt: null, status: 'active' },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    });
  }

  /** Full team directory with roles + status. */
  async getDirectory(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        roles: { select: { role: { select: { key: true, name: true } } } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      status: u.status,
      roles: u.roles.map((r) => r.role.name),
    }));
  }

  // ─────────────── Custom fields ───────────────

  private async readSettings(organizationId: string): Promise<Record<string, unknown>> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { settings: true },
    });
    return ((org.settings as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  }

  private async writeSettings(organizationId: string, settings: Record<string, unknown>) {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: settings as Prisma.InputJsonValue },
    });
  }

  async getCustomFields(organizationId: string, entity: string): Promise<CustomFieldDef[]> {
    const settings = await this.readSettings(organizationId);
    const all = (settings.customFields ?? {}) as Record<string, CustomFieldDef[]>;
    return all[entity] ?? [];
  }

  async updateCustomFields(
    organizationId: string,
    entity: string,
    fields: CustomFieldDef[],
    actorId?: string,
  ): Promise<CustomFieldDef[]> {
    const settings = await this.readSettings(organizationId);
    const all = (settings.customFields ?? {}) as Record<string, CustomFieldDef[]>;
    all[entity] = fields;
    settings.customFields = all;
    await this.writeSettings(organizationId, settings);
    await this.audit.record(organizationId, {
      actorId,
      action: 'org.custom_fields_updated',
      resource: 'organization',
      resourceId: organizationId,
    });
    return fields;
  }

  // ─────────────── AI preferences ───────────────

  async getAiPreference(
    organizationId: string,
  ): Promise<{ provider: string | null; model: string | null }> {
    const settings = await this.readSettings(organizationId);
    const ai = (settings.ai ?? {}) as { provider?: string; model?: string };
    return { provider: ai.provider ?? null, model: ai.model ?? null };
  }

  async updateAiPreference(
    organizationId: string,
    input: { provider?: string | null; model?: string | null },
    actorId?: string,
  ): Promise<{ provider: string | null; model: string | null }> {
    const settings = await this.readSettings(organizationId);
    settings.ai = {
      provider: input.provider || undefined,
      model: input.model || undefined,
    };
    await this.writeSettings(organizationId, settings);
    await this.audit.record(organizationId, {
      actorId,
      action: 'org.ai_preference_updated',
      resource: 'organization',
      resourceId: organizationId,
    });
    return this.getAiPreference(organizationId);
  }

  // ─────────────── Ticket macros (canned replies) ───────────────

  async getTicketMacros(organizationId: string): Promise<{ id: string; title: string; body: string }[]> {
    const settings = await this.readSettings(organizationId);
    return (settings.ticketMacros ?? []) as { id: string; title: string; body: string }[];
  }

  async setTicketMacros(
    organizationId: string,
    macros: { title: string; body: string }[],
    actorId?: string,
  ) {
    const settings = await this.readSettings(organizationId);
    const withIds = macros.map((m, i) => ({
      id: `macro-${m.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i}`,
      title: m.title,
      body: m.body,
    }));
    settings.ticketMacros = withIds;
    await this.writeSettings(organizationId, settings);
    await this.audit.record(organizationId, {
      actorId,
      action: 'org.ticket_macros_updated',
      resource: 'organization',
      resourceId: organizationId,
    });
    return withIds;
  }

  // ─────────────── Scheduled reports ───────────────

  async getScheduledReports(organizationId: string): Promise<{ enabled: boolean }> {
    const settings = await this.readSettings(organizationId);
    const sr = (settings.scheduledReports ?? {}) as { enabled?: boolean };
    return { enabled: !!sr.enabled };
  }

  async setScheduledReports(
    organizationId: string,
    enabled: boolean,
    actorId?: string,
  ): Promise<{ enabled: boolean }> {
    const settings = await this.readSettings(organizationId);
    settings.scheduledReports = { enabled };
    await this.writeSettings(organizationId, settings);
    await this.audit.record(organizationId, {
      actorId,
      action: 'org.scheduled_reports_updated',
      resource: 'organization',
      resourceId: organizationId,
    });
    return { enabled };
  }

  // ─────────────── Security (session idle timeout) ───────────────

  async getSecurity(organizationId: string): Promise<{ idleTimeoutMinutes: number }> {
    const settings = await this.readSettings(organizationId);
    const sec = (settings.security ?? {}) as { idleTimeoutMinutes?: number };
    return { idleTimeoutMinutes: sec.idleTimeoutMinutes ?? 0 };
  }

  async setSecurity(
    organizationId: string,
    idleTimeoutMinutes: number,
    actorId?: string,
  ): Promise<{ idleTimeoutMinutes: number }> {
    const clamped = Math.max(0, Math.min(480, Math.round(idleTimeoutMinutes)));
    const settings = await this.readSettings(organizationId);
    settings.security = { idleTimeoutMinutes: clamped };
    await this.writeSettings(organizationId, settings);
    await this.audit.record(organizationId, {
      actorId,
      action: 'org.security_updated',
      resource: 'organization',
      resourceId: organizationId,
    });
    return { idleTimeoutMinutes: clamped };
  }

  // ─────────────── Saved views ───────────────

  async getSavedViews(organizationId: string, entity: string): Promise<SavedView[]> {
    const settings = await this.readSettings(organizationId);
    const all = (settings.savedViews ?? {}) as Record<string, SavedView[]>;
    return all[entity] ?? [];
  }

  async addSavedView(
    organizationId: string,
    entity: string,
    view: { name: string; query: Record<string, string> },
  ): Promise<SavedView[]> {
    const settings = await this.readSettings(organizationId);
    const all = (settings.savedViews ?? {}) as Record<string, SavedView[]>;
    const list = all[entity] ?? [];
    // Deterministic id (no Math.random / Date.now in this codebase's style needs).
    const id = `${entity}-${view.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${list.length}`;
    const next = [...list.filter((v) => v.name !== view.name), { id, name: view.name, query: view.query }];
    all[entity] = next;
    settings.savedViews = all;
    await this.writeSettings(organizationId, settings);
    return next;
  }

  async removeSavedView(
    organizationId: string,
    entity: string,
    id: string,
  ): Promise<SavedView[]> {
    const settings = await this.readSettings(organizationId);
    const all = (settings.savedViews ?? {}) as Record<string, SavedView[]>;
    all[entity] = (all[entity] ?? []).filter((v) => v.id !== id);
    settings.savedViews = all;
    await this.writeSettings(organizationId, settings);
    return all[entity];
  }
}
