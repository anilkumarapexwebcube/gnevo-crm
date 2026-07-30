import { getCurrentUser } from '@/lib/session';
import { getMembers } from '@/lib/crm-actions';
import { listEvents, upcomingEvents } from '@/lib/calendar-actions';
import { CalendarClient } from './_components/calendar-client';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const user = await getCurrentUser();
  const [events, upcoming, members] = await Promise.all([
    listEvents(),
    upcomingEvents(),
    getMembers(),
  ]);
  return (
    <CalendarClient
      meId={user?.id ?? ''}
      initialEvents={events}
      initialUpcoming={upcoming}
      members={members}
    />
  );
}
