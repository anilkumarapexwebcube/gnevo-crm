'use server';

import { apiServer } from '@/lib/session';

export interface EventAttendee {
  userId: string;
  name: string;
  status: 'invited' | 'accepted' | 'declined';
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  meetingUrl: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  type: 'event' | 'meeting';
  summary: string | null;
  createdBy: string | null;
  attendees: EventAttendee[];
  mine?: boolean;
}

interface Result {
  ok: boolean;
  error?: string;
}

export interface EventInput {
  title: string;
  description?: string;
  location?: string;
  meetingUrl?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  type?: 'event' | 'meeting';
  attendeeIds?: string[];
}

export async function listEvents(from?: string, to?: string): Promise<CalendarEvent[]> {
  try {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    return await apiServer<CalendarEvent[]>(`/v1/calendar/events?${qs.toString()}`);
  } catch {
    return [];
  }
}

export async function upcomingEvents(): Promise<CalendarEvent[]> {
  try {
    return await apiServer<CalendarEvent[]>('/v1/calendar/upcoming');
  } catch {
    return [];
  }
}

export async function createEvent(input: EventInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await apiServer<{ id: string }>('/v1/calendar/events', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return { ok: true, id: res.id };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not create event' };
  }
}

export async function updateEvent(id: string, input: Partial<EventInput>): Promise<Result> {
  try {
    await apiServer(`/v1/calendar/events/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not update event' };
  }
}

export async function summarizeEvent(id: string): Promise<{ ok: boolean; summary?: string; error?: string }> {
  try {
    const res = await apiServer<{ summary: string }>(`/v1/calendar/events/${id}/summary`, { method: 'POST' });
    return { ok: true, summary: res.summary };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not summarize' };
  }
}

export async function respondEvent(id: string, status: 'accepted' | 'declined'): Promise<Result> {
  try {
    await apiServer(`/v1/calendar/events/${id}/respond`, { method: 'POST', body: JSON.stringify({ status }) });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not respond' };
  }
}

export async function deleteEvent(id: string): Promise<Result> {
  try {
    await apiServer(`/v1/calendar/events/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as { apiMessage?: string }).apiMessage ?? 'Could not delete event' };
  }
}
