'use server';

import { revalidatePath } from 'next/cache';
import { CreateCustomerRequestSchema } from '@gnevo/types';
import { apiServer } from '@/lib/session';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function errorMessage(e: unknown): string {
  const status = (e as { status?: number })?.status;
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 401) return 'Your session expired. Please sign in again.';
  return 'Something went wrong. Please try again.';
}

export async function createCustomer(input: unknown): Promise<ActionResult> {
  const parsed = CreateCustomerRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  try {
    await apiServer('/v1/customers', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    revalidatePath('/customers');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/customers/${id}`, { method: 'DELETE' });
    revalidatePath('/customers');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
