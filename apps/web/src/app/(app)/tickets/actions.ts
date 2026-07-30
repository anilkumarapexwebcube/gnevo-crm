'use server';

import { revalidatePath } from 'next/cache';
import {
  AddTicketMessageSchema,
  CreateTicketRequestSchema,
  type TicketPriority,
  type TicketStatus,
} from '@gnevo/types';
import { apiServer } from '@/lib/session';

export async function createTicketIssue(
  id: string,
  provider: 'github' | 'jira',
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const res = await apiServer<{ url: string }>(`/v1/tickets/${id}/issue`, {
      method: 'POST',
      body: JSON.stringify({ provider }),
    });
    return { ok: true, url: res.url };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not create issue' };
  }
}

export interface TicketMacro {
  id: string;
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

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function errorMessage(e: unknown): string {
  const err = e as { status?: number; apiMessage?: string };
  if (err.status === 403) return 'You do not have permission to do that.';
  return err.apiMessage ?? 'Something went wrong. Please try again.';
}

export async function createTicket(input: unknown): Promise<ActionResult> {
  const parsed = CreateTicketRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  try {
    await apiServer('/v1/tickets', { method: 'POST', body: JSON.stringify(parsed.data) });
    revalidatePath('/tickets');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function updateTicket(
  id: string,
  patch: { status?: TicketStatus; priority?: TicketPriority },
): Promise<ActionResult> {
  try {
    await apiServer(`/v1/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    revalidatePath(`/tickets/${id}`);
    revalidatePath('/tickets');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function addTicketMessage(id: string, body: string): Promise<ActionResult> {
  const parsed = AddTicketMessageSchema.safeParse({ body });
  if (!parsed.success) return { ok: false, error: 'Message required' };
  try {
    await apiServer(`/v1/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    revalidatePath(`/tickets/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteTicket(id: string): Promise<ActionResult> {
  try {
    await apiServer(`/v1/tickets/${id}`, { method: 'DELETE' });
    revalidatePath('/tickets');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
