'use server';

import { revalidatePath } from 'next/cache';
import { CreateContactRequestSchema } from '@gnevo/types';
import { apiServer } from '@/lib/session';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function updateCustomer(
  customerId: string,
  input: {
    name?: string;
    type?: string;
    status?: string;
    industry?: string;
    website?: string;
    custom?: Record<string, string>;
  },
): Promise<ActionResult> {
  try {
    await apiServer(`/v1/customers/${customerId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    revalidatePath(`/customers/${customerId}`);
    revalidatePath('/customers');
    return { ok: true };
  } catch (e) {
    const err = e as { status?: number; apiMessage?: string };
    return {
      ok: false,
      error:
        err.status === 403
          ? 'You do not have permission.'
          : err.apiMessage ?? 'Could not update customer',
    };
  }
}

export async function addContact(customerId: string, input: unknown): Promise<ActionResult> {
  const parsed = CreateContactRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  try {
    await apiServer(`/v1/customers/${customerId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    revalidatePath(`/customers/${customerId}`);
    return { ok: true };
  } catch (e) {
    const status = (e as { status?: number })?.status;
    return {
      ok: false,
      error: status === 403 ? 'You do not have permission.' : 'Something went wrong.',
    };
  }
}

export interface Insights {
  churnRisk: string;
  upsell: string;
  summary: string;
}

export interface PortalContact {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  isPrimary: boolean;
  portalEnabled: boolean;
  portalLastLoginAt: string | null;
  portalCanProjects: boolean;
  portalCanInvoices: boolean;
  portalCanTickets: boolean;
}

export interface ShareableRecord { id: string; label: string; visible: boolean }
export interface Shareable { projects: ShareableRecord[]; invoices: ShareableRecord[]; tickets: ShareableRecord[] }

export async function setPortalPermissions(
  customerId: string,
  contactId: string,
  perms: { projects?: boolean; invoices?: boolean; tickets?: boolean },
): Promise<ActionResult> {
  try {
    await apiServer(`/v1/portal/customers/${customerId}/contacts/${contactId}/permissions`, { method: 'POST', body: JSON.stringify(perms) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not update permissions' };
  }
}

export async function getPortalShareable(customerId: string): Promise<Shareable> {
  try {
    return await apiServer<Shareable>(`/v1/portal/customers/${customerId}/shareable`);
  } catch {
    return { projects: [], invoices: [], tickets: [] };
  }
}

export async function setPortalVisibility(
  customerId: string,
  type: 'project' | 'invoice' | 'ticket',
  id: string,
  visible: boolean,
): Promise<ActionResult> {
  try {
    await apiServer(`/v1/portal/customers/${customerId}/visibility`, { method: 'POST', body: JSON.stringify({ type, id, visible }) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not update' };
  }
}

export async function listPortalContacts(
  customerId: string,
): Promise<{ ok: boolean; loginUrl?: string; contacts?: PortalContact[]; error?: string }> {
  try {
    const res = await apiServer<{ loginUrl: string; contacts: PortalContact[] }>(
      `/v1/portal/customers/${customerId}/contacts`,
    );
    return { ok: true, loginUrl: res.loginUrl, contacts: res.contacts };
  } catch (e) {
    const err = e as { apiMessage?: string };
    return { ok: false, error: err.apiMessage ?? 'Could not load portal access' };
  }
}

export async function enablePortalAccess(
  customerId: string,
  contactId: string,
): Promise<{ ok: boolean; email?: string; tempPassword?: string; loginUrl?: string; error?: string }> {
  try {
    const res = await apiServer<{ email: string; tempPassword: string; loginUrl: string }>(
      `/v1/portal/customers/${customerId}/contacts/${contactId}/enable`,
      { method: 'POST' },
    );
    return { ok: true, ...res };
  } catch (e) {
    const err = e as { apiMessage?: string };
    return { ok: false, error: err.apiMessage ?? 'Could not enable portal access' };
  }
}

export async function disablePortalAccess(
  customerId: string,
  contactId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiServer(`/v1/portal/customers/${customerId}/contacts/${contactId}/disable`, {
      method: 'POST',
    });
    return { ok: true };
  } catch (e) {
    const err = e as { apiMessage?: string };
    return { ok: false, error: err.apiMessage ?? 'Could not disable portal access' };
  }
}

export async function getCustomerInsights(
  customerId: string,
): Promise<{ ok: boolean; data?: Insights; error?: string }> {
  try {
    const data = await apiServer<Insights>(`/v1/customers/${customerId}/insights`, {
      method: 'POST',
    });
    return { ok: true, data };
  } catch (e) {
    const err = e as { status?: number; apiMessage?: string };
    return { ok: false, error: err.apiMessage ?? 'Could not generate insights' };
  }
}
