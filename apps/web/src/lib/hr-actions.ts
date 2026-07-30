'use server';

import { apiServer } from '@/lib/session';

export interface Attendance {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
}
export interface LeaveRequest {
  id: string;
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  reviewedByName: string | null;
  createdAt: string;
}
export interface Holiday {
  id: string;
  name: string;
  date: string;
}
interface Result {
  ok: boolean;
  error?: string;
}
const e = (x: unknown, f: string) => (x as { apiMessage?: string }).apiMessage ?? f;

export async function getToday(): Promise<Attendance | null> {
  try {
    return await apiServer<Attendance | null>('/v1/hr/attendance/today');
  } catch {
    return null;
  }
}
export async function getMyAttendance(): Promise<Attendance[]> {
  try {
    return await apiServer<Attendance[]>('/v1/hr/attendance/me');
  } catch {
    return [];
  }
}
export async function clockIn(): Promise<Result> {
  try {
    await apiServer('/v1/hr/attendance/clock-in', { method: 'POST' });
    return { ok: true };
  } catch (x) {
    return { ok: false, error: e(x, 'Clock-in failed') };
  }
}
export async function clockOut(): Promise<Result> {
  try {
    await apiServer('/v1/hr/attendance/clock-out', { method: 'POST' });
    return { ok: true };
  } catch (x) {
    return { ok: false, error: e(x, 'Clock-out failed') };
  }
}

export async function getMyLeaves(): Promise<LeaveRequest[]> {
  try {
    return await apiServer<LeaveRequest[]>('/v1/hr/leaves/me');
  } catch {
    return [];
  }
}
export async function getAllLeaves(): Promise<LeaveRequest[]> {
  try {
    return await apiServer<LeaveRequest[]>('/v1/hr/leaves');
  } catch {
    return [];
  }
}
export async function submitLeave(input: { type: string; startDate: string; endDate: string; reason?: string }): Promise<Result> {
  try {
    await apiServer('/v1/hr/leaves', { method: 'POST', body: JSON.stringify(input) });
    return { ok: true };
  } catch (x) {
    return { ok: false, error: e(x, 'Could not submit leave') };
  }
}
export async function decideLeave(id: string, status: 'approved' | 'rejected'): Promise<Result> {
  try {
    await apiServer(`/v1/hr/leaves/${id}/decide`, { method: 'POST', body: JSON.stringify({ status }) });
    return { ok: true };
  } catch (x) {
    return { ok: false, error: e(x, 'Could not update') };
  }
}
export async function cancelLeave(id: string): Promise<Result> {
  try {
    await apiServer(`/v1/hr/leaves/${id}/cancel`, { method: 'POST' });
    return { ok: true };
  } catch (x) {
    return { ok: false, error: e(x, 'Could not cancel') };
  }
}

export interface HrAnalytics {
  headcount: number;
  presentToday: number;
  attendanceRate: number;
  pendingLeaves: number;
  byRole: { key: string; value: number }[];
  byDepartment: { key: string; value: number }[];
  leaves: { pending: number; approved: number; rejected: number };
  totalHours: number;
  workingHours: { name: string; hours: number; days: number }[];
}
export async function getAnalytics(): Promise<HrAnalytics | null> {
  try {
    return await apiServer<HrAnalytics>('/v1/hr/analytics');
  } catch {
    return null;
  }
}

export interface LoginEntry { userName: string; ip: string | null; userAgent: string | null; at: string }
export interface AttendanceEntry { id: string; userName: string; date: string; checkIn: string | null; checkOut: string | null; status: string }

export async function getLoginHistory(): Promise<LoginEntry[]> {
  try {
    return await apiServer<LoginEntry[]>('/v1/hr/reports/logins');
  } catch {
    return [];
  }
}
export async function getAttendanceHistory(): Promise<AttendanceEntry[]> {
  try {
    return await apiServer<AttendanceEntry[]>('/v1/hr/reports/attendance');
  } catch {
    return [];
  }
}
export async function clearLoginHistory(): Promise<Result> {
  try {
    await apiServer('/v1/hr/reports/logins', { method: 'DELETE' });
    return { ok: true };
  } catch (x) {
    return { ok: false, error: e(x, 'Could not clear') };
  }
}
export async function clearAttendanceHistory(): Promise<Result> {
  try {
    await apiServer('/v1/hr/reports/attendance', { method: 'DELETE' });
    return { ok: true };
  } catch (x) {
    return { ok: false, error: e(x, 'Could not clear') };
  }
}

export async function listHolidays(): Promise<Holiday[]> {
  try {
    return await apiServer<Holiday[]>('/v1/hr/holidays');
  } catch {
    return [];
  }
}
export async function createHoliday(name: string, date: string): Promise<Result> {
  try {
    await apiServer('/v1/hr/holidays', { method: 'POST', body: JSON.stringify({ name, date }) });
    return { ok: true };
  } catch (x) {
    return { ok: false, error: e(x, 'Could not add holiday') };
  }
}
export async function deleteHoliday(id: string): Promise<Result> {
  try {
    await apiServer(`/v1/hr/holidays/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch (x) {
    return { ok: false, error: e(x, 'Could not delete') };
  }
}
