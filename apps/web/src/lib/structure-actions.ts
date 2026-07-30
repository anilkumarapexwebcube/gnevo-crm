'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/session';

export interface OfficeRow { id: string; name: string; timezone: string; departmentCount: number; memberCount: number }
export interface DepartmentRow { id: string; name: string; officeId: string | null; officeName: string | null; managerId: string | null; managerName: string | null; memberCount: number }
export interface TeamRow { id: string; name: string; departmentId: string | null; departmentName: string | null; managerId: string | null; managerName: string | null; members: { id: string; name: string }[] }
export interface StructureMember {
  id: string;
  fullName: string;
  email: string;
  departmentId: string | null;
  officeId: string | null;
  designation: string | null;
  reportingManagerId: string | null;
  roleKey: string;
  roleName: string;
  isOwner: boolean;
}
export interface StructureOverview { offices: OfficeRow[]; departments: DepartmentRow[]; teams: TeamRow[]; members: StructureMember[] }

interface Result { ok: boolean; error?: string }
const e = (x: unknown, f: string) => (x as { apiMessage?: string }).apiMessage ?? f;

export interface DepartmentAnalytics {
  id: string;
  name: string;
  office: string | null;
  managerName: string | null;
  memberCount: number;
  teamCount: number;
  members: { id: string; name: string; role: string }[];
  teams: { id: string; name: string; members: number }[];
  tasks: { total: number; done: number; overdue: number; completion: number };
}

export async function getDepartmentAnalytics(id: string): Promise<DepartmentAnalytics | null> {
  try {
    return await apiServer<DepartmentAnalytics>(`/v1/departments/${id}/analytics`);
  } catch {
    return null;
  }
}

export async function getStructure(): Promise<StructureOverview> {
  try {
    return await apiServer<StructureOverview>('/v1/structure');
  } catch {
    return { offices: [], departments: [], teams: [], members: [] };
  }
}

async function mutate(path: string, method: string, body?: unknown, fallback = 'Action failed'): Promise<Result> {
  try {
    await apiServer(path, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    revalidatePath('/structure');
    return { ok: true };
  } catch (x) {
    return { ok: false, error: e(x, fallback) };
  }
}

export async function createOffice(name: string, timezone?: string) {
  return mutate('/v1/offices', 'POST', { name, timezone });
}
export async function updateOffice(id: string, body: { name?: string; timezone?: string }) {
  return mutate(`/v1/offices/${id}`, 'PATCH', body);
}
export async function deleteOffice(id: string) {
  return mutate(`/v1/offices/${id}`, 'DELETE');
}

export async function createDepartment(body: { name: string; officeId?: string; managerId?: string }) {
  return mutate('/v1/departments', 'POST', body);
}
export async function updateDepartment(id: string, body: { name?: string; officeId?: string | null; managerId?: string | null }) {
  return mutate(`/v1/departments/${id}`, 'PATCH', body);
}
export async function deleteDepartment(id: string) {
  return mutate(`/v1/departments/${id}`, 'DELETE');
}

export async function createTeam(body: { name: string; departmentId?: string; managerId?: string }) {
  return mutate('/v1/teams', 'POST', body);
}
export async function updateTeam(id: string, body: { name?: string; departmentId?: string | null; managerId?: string | null }) {
  return mutate(`/v1/teams/${id}`, 'PATCH', body);
}
export async function deleteTeam(id: string) {
  return mutate(`/v1/teams/${id}`, 'DELETE');
}
export async function addTeamMember(teamId: string, userId: string) {
  return mutate(`/v1/teams/${teamId}/members`, 'POST', { userId });
}
export async function removeTeamMember(teamId: string, userId: string) {
  return mutate(`/v1/teams/${teamId}/members/${userId}`, 'DELETE');
}

export async function assignUser(userId: string, body: { departmentId?: string | null; officeId?: string | null }) {
  return mutate(`/v1/users/${userId}/assignment`, 'POST', body);
}
