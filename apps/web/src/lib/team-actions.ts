'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/session';

export interface TeamUser {
  id: string;
  fullName: string;
  email: string;
  status: string;
  roleId: string | null;
  roleKey: string;
  roleName: string;
  department: string | null;
  createdAt: string;
  isOwner: boolean;
  hasAvatar: boolean;
}

export interface RolePerm { resource: string; action: string; scope: string }
export interface RoleRow { id: string; key: string; name: string; isSystem: boolean; memberCount: number; permissions: RolePerm[] }
export interface RoleCatalog { resources: string[]; actions: string[]; scopes: string[] }

export interface EmployeeProfile {
  id: string;
  fullName: string;
  email: string;
  status: string;
  roleName: string;
  designation: string | null;
  employeeId: string | null;
  joiningDate: string | null;
  reportingManagerId: string | null;
  reportingManagerName: string | null;
  department: { id: string; name: string } | null;
  office: { id: string; name: string } | null;
  teams: { id: string; name: string }[];
  hasAvatar: boolean;
  createdAt: string;
}
export interface Productivity {
  tasksTotal: number;
  tasksDone: number;
  tasksInProgress: number;
  tasksTodo: number;
  tasksOverdue: number;
  completionRate: number;
}

export interface Invitation {
  id: string;
  email: string;
  roleKey: string;
  roleName: string;
  status: string;
  invitedByName: string | null;
  expiresAt: string;
  createdAt: string;
  expired: boolean;
}

interface Result {
  ok: boolean;
  error?: string;
}
const err = (e: unknown, fallback: string) => (e as { apiMessage?: string }).apiMessage ?? fallback;

/* ── Users ── */

export async function listUsers(): Promise<TeamUser[]> {
  try {
    return await apiServer<TeamUser[]>('/v1/users');
  } catch {
    return [];
  }
}

export async function changeUserRole(id: string, roleId: string): Promise<Result> {
  try {
    await apiServer(`/v1/users/${id}/role`, { method: 'POST', body: JSON.stringify({ roleId }) });
    revalidatePath('/directory');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not change role') };
  }
}

/* ── Team export (Excel / PDF) ── */

export async function exportTeamExcel(): Promise<{ ok: boolean; base64?: string; error?: string }> {
  try {
    const users = await listUsers();
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Team');
    ws.addRow(['Name', 'Email', 'Role', 'Department', 'Status']);
    ws.getRow(1).font = { bold: true };
    users.forEach((u) => ws.addRow([u.fullName, u.email, u.roleName, u.department ?? '', u.status]));
    ws.columns.forEach((c) => { c.width = 24; });
    const buf = await wb.xlsx.writeBuffer();
    return { ok: true, base64: Buffer.from(buf).toString('base64') };
  } catch {
    return { ok: false, error: 'Excel export failed' };
  }
}

export async function exportTeamPdf(): Promise<{ ok: boolean; base64?: string; error?: string }> {
  try {
    const users = await listUsers();
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const pageW = 595, pageH = 842, margin = 40, lineH = 16;
    let page = doc.addPage([pageW, pageH]);
    let y = pageH - margin;
    page.drawText('Team directory', { x: margin, y, size: 14, font: bold });
    y -= lineH * 1.5;
    const cols = ['Name', 'Email', 'Role', 'Department', 'Status'];
    const drawRow = (cells: string[], f: typeof font, color = rgb(0.1, 0.1, 0.1)) => {
      if (y < margin) { page = doc.addPage([pageW, pageH]); y = pageH - margin; }
      const colW = (pageW - margin * 2) / cells.length;
      cells.forEach((c, i) => {
        const text = c.length > 26 ? `${c.slice(0, 24)}…` : c;
        page.drawText(text, { x: margin + i * colW, y, size: 8, font: f, color });
      });
      y -= lineH;
    };
    drawRow(cols, bold);
    users.forEach((u) => drawRow([u.fullName, u.email, u.roleName, u.department ?? '', u.status], font));
    const bytes = await doc.save();
    return { ok: true, base64: Buffer.from(bytes).toString('base64') };
  } catch {
    return { ok: false, error: 'PDF export failed' };
  }
}

export interface MemberPerformance { id: string; name: string; total: number; done: number; overdue: number; completion: number }
export async function getTeamPerformance(): Promise<MemberPerformance[]> {
  try {
    return await apiServer<MemberPerformance[]>('/v1/users/performance');
  } catch {
    return [];
  }
}

/* ── Roles & permissions (Phase 4) ── */

export async function listRoles(): Promise<RoleRow[]> {
  try {
    return await apiServer<RoleRow[]>('/v1/roles');
  } catch {
    return [];
  }
}

export async function getRoleCatalog(): Promise<RoleCatalog> {
  try {
    return await apiServer<RoleCatalog>('/v1/roles/catalog');
  } catch {
    return { resources: [], actions: [], scopes: [] };
  }
}

export async function createRole(name: string, permissions: RolePerm[]): Promise<Result> {
  try {
    await apiServer('/v1/roles', { method: 'POST', body: JSON.stringify({ name, permissions }) });
    revalidatePath('/roles');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not create role') };
  }
}

export async function cloneRole(id: string, name?: string): Promise<Result> {
  try {
    await apiServer(`/v1/roles/${id}/clone`, { method: 'POST', body: JSON.stringify({ name }) });
    revalidatePath('/roles');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not clone role') };
  }
}

export async function updateRole(id: string, body: { name?: string; permissions?: RolePerm[] }): Promise<Result> {
  try {
    await apiServer(`/v1/roles/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    revalidatePath('/roles');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not update role') };
  }
}

export async function deleteRole(id: string): Promise<Result> {
  try {
    await apiServer(`/v1/roles/${id}`, { method: 'DELETE' });
    revalidatePath('/roles');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not delete role') };
  }
}

/* ── Employee profile (Phase 5) ── */

export async function getMyProfile(): Promise<EmployeeProfile | null> {
  try {
    return await apiServer<EmployeeProfile>('/v1/users/me/profile');
  } catch {
    return null;
  }
}

export async function getMyProductivity(): Promise<Productivity | null> {
  try {
    return await apiServer<Productivity>('/v1/users/me/productivity');
  } catch {
    return null;
  }
}

export async function getUserProfile(id: string): Promise<EmployeeProfile | null> {
  try {
    return await apiServer<EmployeeProfile>(`/v1/users/${id}/profile`);
  } catch {
    return null;
  }
}

export async function getUserProductivity(id: string): Promise<Productivity | null> {
  try {
    return await apiServer<Productivity>(`/v1/users/${id}/productivity`);
  } catch {
    return null;
  }
}

export async function updateUserProfile(
  id: string,
  body: { designation?: string | null; employeeId?: string | null; joiningDate?: string | null; reportingManagerId?: string | null },
): Promise<Result> {
  try {
    await apiServer(`/v1/users/${id}/profile`, { method: 'PATCH', body: JSON.stringify(body) });
    revalidatePath('/directory');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not update profile') };
  }
}

export async function suspendUser(id: string): Promise<Result> {
  try {
    await apiServer(`/v1/users/${id}/suspend`, { method: 'POST' });
    revalidatePath('/directory');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not suspend') };
  }
}

export async function reactivateUser(id: string): Promise<Result> {
  try {
    await apiServer(`/v1/users/${id}/reactivate`, { method: 'POST' });
    revalidatePath('/directory');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not reactivate') };
  }
}

export async function deleteUser(id: string): Promise<Result> {
  try {
    await apiServer(`/v1/users/${id}`, { method: 'DELETE' });
    revalidatePath('/directory');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not delete') };
  }
}

export async function restoreUser(id: string): Promise<Result> {
  try {
    await apiServer(`/v1/users/${id}/restore`, { method: 'POST' });
    revalidatePath('/directory');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not restore') };
  }
}

export async function transferOwnership(userId: string): Promise<Result> {
  try {
    await apiServer('/v1/users/transfer-ownership', { method: 'POST', body: JSON.stringify({ userId }) });
    revalidatePath('/directory');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not transfer ownership') };
  }
}

/* ── Invitations ── */

export async function listInvitations(): Promise<Invitation[]> {
  try {
    return await apiServer<Invitation[]>('/v1/invitations');
  } catch {
    return [];
  }
}

export async function createInvite(
  email: string,
  roleKey: string,
  opts?: { departmentId?: string; teamId?: string },
): Promise<Result> {
  try {
    await apiServer('/v1/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email,
        roleKey,
        ...(opts?.departmentId ? { departmentId: opts.departmentId } : {}),
        ...(opts?.teamId ? { teamId: opts.teamId } : {}),
      }),
    });
    revalidatePath('/directory');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not send invite') };
  }
}

export async function createUser(dto: {
  fullName: string;
  email: string;
  password: string;
  roleKey: string;
  departmentId?: string;
  teamId?: string;
}): Promise<Result> {
  try {
    await apiServer('/v1/users', {
      method: 'POST',
      body: JSON.stringify({
        fullName: dto.fullName,
        email: dto.email,
        password: dto.password,
        roleKey: dto.roleKey,
        ...(dto.departmentId ? { departmentId: dto.departmentId } : {}),
        ...(dto.teamId ? { teamId: dto.teamId } : {}),
      }),
    });
    revalidatePath('/directory');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not create user') };
  }
}

export async function bulkInvite(
  emails: string[],
  roleKey: string,
): Promise<{ ok: boolean; created?: number; skipped?: string[]; error?: string }> {
  try {
    const res = await apiServer<{ created: number; skipped: string[] }>('/v1/invitations/bulk', {
      method: 'POST',
      body: JSON.stringify({ emails, roleKey }),
    });
    revalidatePath('/directory');
    return { ok: true, created: res.created, skipped: res.skipped };
  } catch (e) {
    return { ok: false, error: err(e, 'Bulk invite failed') };
  }
}

export async function resendInvite(id: string): Promise<Result> {
  try {
    await apiServer(`/v1/invitations/${id}/resend`, { method: 'POST' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not resend') };
  }
}

export async function cancelInvite(id: string): Promise<Result> {
  try {
    await apiServer(`/v1/invitations/${id}/cancel`, { method: 'POST' });
    revalidatePath('/directory');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: err(e, 'Could not cancel') };
  }
}
