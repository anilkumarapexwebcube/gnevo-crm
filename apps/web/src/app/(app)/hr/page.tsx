import { getCurrentUser } from '@/lib/session';
import { getToday, getMyAttendance, getMyLeaves, getAllLeaves, listHolidays, getAnalytics, getLoginHistory, getAttendanceHistory } from '@/lib/hr-actions';
import { HrManager } from './_components/hr-manager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'HR | Gnevo CRM' };

export default async function HrPage() {
  const user = await getCurrentUser();
  const canManage = !!user?.roles.some((r) => r === 'owner' || r === 'admin' || r === 'hr');
  const [today, attendance, myLeaves, holidays, allLeaves, analytics, logins, attendanceLog] = await Promise.all([
    getToday(),
    getMyAttendance(),
    getMyLeaves(),
    listHolidays(),
    canManage ? getAllLeaves() : Promise.resolve([]),
    canManage ? getAnalytics() : Promise.resolve(null),
    canManage ? getLoginHistory() : Promise.resolve([]),
    canManage ? getAttendanceHistory() : Promise.resolve([]),
  ]);
  return (
    <HrManager
      canManage={canManage}
      initialToday={today}
      attendance={attendance}
      myLeaves={myLeaves}
      allLeaves={allLeaves}
      holidays={holidays}
      analytics={analytics}
      logins={logins}
      attendanceLog={attendanceLog}
    />
  );
}
