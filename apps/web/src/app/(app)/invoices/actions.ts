'use server';

import { revalidatePath } from 'next/cache';
import { CreateInvoiceRequestSchema, type InvoiceStatus } from '@gnevo/types';
import { apiServer } from '@/lib/session';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function errorMessage(e: unknown): string {
  const err = e as { status?: number; apiMessage?: string };
  if (err.status === 403) return 'You do not have permission to do that.';
  return err.apiMessage ?? 'Something went wrong. Please try again.';
}

export async function createInvoice(input: unknown): Promise<ActionResult> {
  const parsed = CreateInvoiceRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  try {
    await apiServer('/v1/invoices', { method: 'POST', body: JSON.stringify(parsed.data) });
    revalidatePath('/invoices');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function setInvoiceStatus(id: string, status: InvoiceStatus): Promise<ActionResult> {
  try {
    await apiServer(`/v1/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    revalidatePath(`/invoices/${id}`);
    revalidatePath('/invoices');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/invoices/${id}`, { method: 'DELETE' });
    revalidatePath('/invoices');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function checkoutInvoice(
  id: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const res = await apiServer<{ url: string }>(`/v1/invoices/${id}/checkout`, { method: 'POST' });
    return { ok: true, url: res.url };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
