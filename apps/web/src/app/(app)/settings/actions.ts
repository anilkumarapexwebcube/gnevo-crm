'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/session';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function updateProfile(input: {
  fullName?: string;
  email?: string;
}): Promise<ActionResult> {
  try {
    await apiServer('/v1/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    revalidatePath('/settings');
    revalidatePath('/profile');
    return { ok: true };
  } catch (e) {
    const err = e as { apiMessage?: string };
    return { ok: false, error: err.apiMessage ?? 'Could not update profile' };
  }
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  try {
    await apiServer('/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return { ok: true };
  } catch (e) {
    const err = e as { apiMessage?: string };
    return { ok: false, error: err.apiMessage ?? 'Could not change password' };
  }
}

export async function setupTwoFactor(): Promise<{
  ok: boolean;
  qr?: string;
  secret?: string;
  error?: string;
}> {
  try {
    const res = await apiServer<{ qr: string; secret: string; otpauthUri: string }>(
      '/v1/auth/2fa/setup',
      { method: 'POST' },
    );
    return { ok: true, qr: res.qr, secret: res.secret };
  } catch (e) {
    const err = e as { apiMessage?: string };
    return { ok: false, error: err.apiMessage ?? 'Could not start 2FA setup' };
  }
}

export async function enableTwoFactor(code: string): Promise<ActionResult> {
  try {
    await apiServer('/v1/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) });
    revalidatePath('/settings');
    revalidatePath('/profile');
    return { ok: true };
  } catch (e) {
    const err = e as { apiMessage?: string };
    return { ok: false, error: err.apiMessage ?? 'Invalid code' };
  }
}

export async function disableTwoFactor(code: string): Promise<ActionResult> {
  try {
    await apiServer('/v1/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) });
    revalidatePath('/settings');
    revalidatePath('/profile');
    return { ok: true };
  } catch (e) {
    const err = e as { apiMessage?: string };
    return { ok: false, error: err.apiMessage ?? 'Could not disable 2FA' };
  }
}

export interface LoginHistoryEntry {
  ip: string | null;
  userAgent: string | null;
  at: string;
}

export async function getLoginHistory(): Promise<LoginHistoryEntry[]> {
  try {
    return await apiServer<LoginHistoryEntry[]>('/v1/auth/login-history');
  } catch {
    return [];
  }
}

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export async function getSessions(): Promise<SessionInfo[]> {
  try {
    return await apiServer<SessionInfo[]>('/v1/auth/sessions');
  } catch {
    return [];
  }
}

export async function revokeSession(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/auth/sessions/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not revoke' };
  }
}

export async function revokeAllSessions(): Promise<ActionResult> {
  try {
    await apiServer('/v1/auth/sessions/revoke-all', { method: 'POST' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not revoke' };
  }
}

export interface CustomFieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'url';
}

export async function updateCustomFields(
  entity: string,
  fields: CustomFieldDef[],
): Promise<ActionResult> {
  try {
    await apiServer('/v1/org/custom-fields', {
      method: 'PATCH',
      body: JSON.stringify({ entity, fields }),
    });
    revalidatePath('/settings');
    return { ok: true };
  } catch (e) {
    const err = e as { status?: number; apiMessage?: string };
    return {
      ok: false,
      error:
        err.status === 403 ? 'Only owners/admins can edit custom fields.' : err.apiMessage ?? 'Could not save',
    };
  }
}

export interface TicketMacro {
  id?: string;
  title: string;
  body: string;
}

export async function getTicketMacros(): Promise<TicketMacro[]> {
  try {
    return await apiServer<TicketMacro[]>('/v1/org/ticket-macros');
  } catch {
    return [];
  }
}

export async function updateTicketMacros(
  macros: { title: string; body: string }[],
): Promise<ActionResult> {
  try {
    await apiServer('/v1/org/ticket-macros', { method: 'PATCH', body: JSON.stringify({ macros }) });
    revalidatePath('/settings');
    return { ok: true };
  } catch (e) {
    const err = e as { status?: number; apiMessage?: string };
    return {
      ok: false,
      error: err.status === 403 ? 'Only owners/admins can edit macros.' : err.apiMessage ?? 'Could not save',
    };
  }
}

export interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastStatus: number | null;
  lastFiredAt: string | null;
  failureCount: number;
  createdAt: string;
}

export async function getWebhooks(): Promise<WebhookRow[]> {
  try {
    return await apiServer<WebhookRow[]>('/v1/webhooks');
  } catch {
    return [];
  }
}

export async function createWebhook(
  url: string,
  events: string[],
): Promise<{ ok: boolean; secret?: string; error?: string }> {
  try {
    const res = await apiServer<{ secret: string }>('/v1/webhooks', {
      method: 'POST',
      body: JSON.stringify({ url, events }),
    });
    return { ok: true, secret: res.secret };
  } catch (e) {
    const err = e as { status?: number; apiMessage?: string };
    return {
      ok: false,
      error: err.status === 403 ? 'Only owners/admins can do this.' : err.apiMessage ?? 'Could not create',
    };
  }
}

export async function deleteWebhook(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/webhooks/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not delete' };
  }
}

export async function updateWebhook(
  id: string,
  patch: { url?: string; events?: string[] },
): Promise<ActionResult> {
  try {
    await apiServer(`/v1/webhooks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not update' };
  }
}

export async function toggleWebhook(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/webhooks/${id}/toggle`, { method: 'POST' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not toggle' };
  }
}

export async function regenerateWebhookSecret(
  id: string,
): Promise<{ ok: boolean; secret?: string; error?: string }> {
  try {
    const res = await apiServer<{ secret: string }>(`/v1/webhooks/${id}/regenerate-secret`, {
      method: 'POST',
    });
    return { ok: true, secret: res.secret };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not regenerate' };
  }
}

export async function testWebhook(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/webhooks/${id}/test`, { method: 'POST' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not send test' };
  }
}

export interface WebhookDelivery {
  id: string;
  event: string;
  statusCode: number | null;
  ok: boolean;
  responseTimeMs: number | null;
  responseBody: string | null;
  attempt: number;
  createdAt: string;
}

export async function getWebhookDeliveries(id: string): Promise<WebhookDelivery[]> {
  try {
    return await apiServer<WebhookDelivery[]>(`/v1/webhooks/${id}/deliveries`);
  } catch {
    return [];
  }
}

export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export async function getApiKeys(): Promise<ApiKeyRow[]> {
  try {
    return await apiServer<ApiKeyRow[]>('/v1/api-keys');
  } catch {
    return [];
  }
}

export async function createApiKey(
  name: string,
): Promise<{ ok: boolean; key?: string; error?: string }> {
  try {
    const res = await apiServer<{ key: string }>('/v1/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return { ok: true, key: res.key };
  } catch (e) {
    const err = e as { status?: number; apiMessage?: string };
    return {
      ok: false,
      error: err.status === 403 ? 'Only owners/admins can do this.' : err.apiMessage ?? 'Could not create key',
    };
  }
}

export async function revokeApiKey(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/api-keys/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not revoke' };
  }
}

export async function getSecuritySettings(): Promise<{ idleTimeoutMinutes: number }> {
  try {
    return await apiServer<{ idleTimeoutMinutes: number }>('/v1/org/security');
  } catch {
    return { idleTimeoutMinutes: 0 };
  }
}

export async function updateSecuritySettings(idleTimeoutMinutes: number): Promise<ActionResult> {
  try {
    await apiServer('/v1/org/security', { method: 'PATCH', body: JSON.stringify({ idleTimeoutMinutes }) });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    const err = e as { status?: number; apiMessage?: string };
    return { ok: false, error: err.status === 403 ? 'Only owners/admins can change this.' : err.apiMessage ?? 'Could not save' };
  }
}

export async function updateScheduledReports(enabled: boolean): Promise<ActionResult> {
  try {
    await apiServer('/v1/org/scheduled-reports', {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
    revalidatePath('/settings');
    return { ok: true };
  } catch (e) {
    const err = e as { status?: number; apiMessage?: string };
    return {
      ok: false,
      error: err.status === 403 ? 'Only owners/admins can change this.' : err.apiMessage ?? 'Could not save',
    };
  }
}

export async function updateAiPreference(input: {
  provider?: string | null;
  model?: string | null;
}): Promise<ActionResult> {
  try {
    await apiServer('/v1/org/ai-preferences', { method: 'PATCH', body: JSON.stringify(input) });
    revalidatePath('/settings');
    return { ok: true };
  } catch (e) {
    const err = e as { status?: number; apiMessage?: string };
    return {
      ok: false,
      error:
        err.status === 403 ? 'Only owners/admins can change this.' : err.apiMessage ?? 'Could not save',
    };
  }
}

export interface IntegrationsConfig {
  slack: { configured: boolean; events: string[]; enabled: boolean };
  telegram: { configured: boolean; chatId: string; events: string[]; enabled: boolean };
  github: { configured: boolean; repo: string; enabled: boolean };
  jira: { configured: boolean; domain: string; email: string; projectKey: string; enabled: boolean };
  availableEvents: { value: string; label: string }[];
}

export async function getIntegrations(): Promise<IntegrationsConfig | null> {
  try {
    return await apiServer<IntegrationsConfig>('/v1/org/integrations');
  } catch {
    return null;
  }
}

export async function updateIntegrations(patch: Record<string, unknown>): Promise<ActionResult> {
  try {
    await apiServer('/v1/org/integrations', { method: 'PATCH', body: JSON.stringify(patch) });
    revalidatePath('/settings');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not save' };
  }
}

export async function testIntegration(provider: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/org/integrations/${provider}/test`, { method: 'POST' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Test failed' };
  }
}

export async function updateBranding(input: {
  displayName?: string;
  brandColor?: string;
  theme?: 'light' | 'dark' | 'system';
}): Promise<ActionResult> {
  try {
    await apiServer('/v1/org/branding', { method: 'PATCH', body: JSON.stringify(input) });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    const err = e as { status?: number; apiMessage?: string };
    return {
      ok: false,
      error:
        err.status === 403
          ? 'Only owners/admins can change branding.'
          : err.apiMessage ?? 'Could not save branding',
    };
  }
}
