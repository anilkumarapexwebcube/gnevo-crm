import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SYSTEM_ROLE_NAMES } from '@gnevo/auth';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../events/notifications.service.js';

const ROLE_RANK = ['viewer', 'member', 'manager', 'hr', 'admin', 'owner'];
const primaryKey = (keys: string[]) =>
  keys.slice().sort((a, b) => ROLE_RANK.indexOf(b) - ROLE_RANK.indexOf(a))[0] ?? 'member';

function today(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

@Injectable()
export class HrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ── Attendance ── */

  async clockIn(organizationId: string, userId: string) {
    const db = this.prisma.forTenant(organizationId);
    const date = today();
    const existing = await db.attendance.findFirst({ where: { userId, date } });
    if (existing?.checkIn) return existing;
    if (existing) {
      return db.attendance.update({ where: { id: existing.id }, data: { checkIn: new Date(), status: 'present' } });
    }
    return db.attendance.create({
      data: { organizationId, userId, date, checkIn: new Date(), status: 'present' },
    });
  }

  async clockOut(organizationId: string, userId: string) {
    const db = this.prisma.forTenant(organizationId);
    const date = today();
    const existing = await db.attendance.findFirst({ where: { userId, date } });
    if (!existing) throw new BadRequestException('Clock in first');
    return db.attendance.update({ where: { id: existing.id }, data: { checkOut: new Date() } });
  }

  async today(organizationId: string, userId: string) {
    const db = this.prisma.forTenant(organizationId);
    return (await db.attendance.findFirst({ where: { userId, date: today() } })) ?? null;
  }

  async myAttendance(organizationId: string, userId: string) {
    const db = this.prisma.forTenant(organizationId);
    const since = new Date();
    since.setDate(since.getDate() - 45);
    return db.attendance.findMany({
      where: { userId, date: { gte: new Date(Date.UTC(since.getFullYear(), since.getMonth(), since.getDate())) } },
      orderBy: { date: 'desc' },
    });
  }

  /* ── Leave ── */

  async submitLeave(
    organizationId: string,
    user: { id: string; name: string },
    dto: { type: string; startDate: string; endDate: string; reason?: string },
  ) {
    if (new Date(dto.startDate) > new Date(dto.endDate)) throw new BadRequestException('End date must be after start date');
    const db = this.prisma.forTenant(organizationId);
    const leave = await db.leaveRequest.create({
      data: {
        organizationId,
        userId: user.id,
        userName: user.name,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason ?? null,
      },
    });
    // Notify owner/admin/hr approvers.
    const approvers = await this.prisma.user.findMany({
      where: { organizationId, deletedAt: null, status: 'active', roles: { some: { role: { key: { in: ['owner', 'admin', 'hr'] } } } } },
      select: { id: true },
    });
    await Promise.all(
      approvers
        .filter((a) => a.id !== user.id)
        .map((a) =>
          this.notifications.notify(organizationId, a.id, {
            title: `Leave request from ${user.name}`,
            body: `${dto.type} · ${dto.startDate} → ${dto.endDate}`,
            link: '/hr',
            type: 'leave',
          }),
        ),
    );
    return leave;
  }

  async myLeaves(organizationId: string, userId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.leaveRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async allLeaves(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.leaveRequest.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 200 });
  }

  async decideLeave(organizationId: string, reviewer: { id: string; name: string }, id: string, status: 'approved' | 'rejected') {
    const db = this.prisma.forTenant(organizationId);
    const leave = await db.leaveRequest.findFirst({ where: { id } });
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.status !== 'pending') throw new BadRequestException('This request was already reviewed');
    const updated = await db.leaveRequest.update({
      where: { id },
      data: { status, reviewedById: reviewer.id, reviewedByName: reviewer.name, reviewedAt: new Date() },
    });
    await this.notifications.notify(organizationId, leave.userId, {
      title: `Leave ${status}`,
      body: `Your ${leave.type} leave request was ${status} by ${reviewer.name}.`,
      link: '/hr',
      type: 'leave',
    });
    return updated;
  }

  async cancelLeave(organizationId: string, userId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const leave = await db.leaveRequest.findFirst({ where: { id, userId } });
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.status !== 'pending') throw new BadRequestException('Only pending requests can be cancelled');
    await db.leaveRequest.delete({ where: { id } });
    return { ok: true };
  }

  /* ── Analytics (HR/admin) ── */

  async analytics(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    const monthStart = (() => {
      const n = new Date();
      return new Date(Date.UTC(n.getFullYear(), n.getMonth(), 1));
    })();
    const [members, attendanceToday, leaves, monthAttendance] = await Promise.all([
      db.user.findMany({
        where: { deletedAt: null, status: 'active' },
        select: { id: true, fullName: true, department: { select: { name: true } }, roles: { select: { role: { select: { key: true } } } } },
      }),
      db.attendance.count({ where: { date: today(), checkIn: { not: null } } }),
      db.leaveRequest.findMany({ select: { status: true } }),
      db.attendance.findMany({
        where: { date: { gte: monthStart } },
        select: { userId: true, checkIn: true, checkOut: true },
      }),
    ]);

    const byRoleMap = new Map<string, number>();
    const byDeptMap = new Map<string, number>();
    for (const m of members) {
      const rk = primaryKey(m.roles.map((r) => r.role.key));
      const rn = SYSTEM_ROLE_NAMES[rk as keyof typeof SYSTEM_ROLE_NAMES] ?? rk;
      byRoleMap.set(rn, (byRoleMap.get(rn) ?? 0) + 1);
      const dn = m.department?.name ?? 'Unassigned';
      byDeptMap.set(dn, (byDeptMap.get(dn) ?? 0) + 1);
    }

    const leaveStatus = { pending: 0, approved: 0, rejected: 0 };
    for (const l of leaves) {
      if (l.status in leaveStatus) leaveStatus[l.status as keyof typeof leaveStatus] += 1;
    }

    // Working-hours this month, per employee.
    const nameOf = new Map(members.map((m) => [m.id, m.fullName]));
    const hoursMap = new Map<string, { hours: number; days: number }>();
    for (const a of monthAttendance) {
      if (!a.checkIn) continue;
      const entry = hoursMap.get(a.userId) ?? { hours: 0, days: 0 };
      entry.days += 1;
      if (a.checkOut) entry.hours += (new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime()) / 3_600_000;
      hoursMap.set(a.userId, entry);
    }
    const workingHours = [...hoursMap.entries()]
      .map(([id, v]) => ({ name: nameOf.get(id) ?? 'Unknown', hours: Math.round(v.hours * 10) / 10, days: v.days }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
    const totalHours = Math.round([...hoursMap.values()].reduce((s, v) => s + v.hours, 0));

    const headcount = members.length;
    return {
      headcount,
      presentToday: attendanceToday,
      attendanceRate: headcount ? Math.round((attendanceToday / headcount) * 100) : 0,
      byRole: [...byRoleMap.entries()].map(([key, value]) => ({ key, value })),
      byDepartment: [...byDeptMap.entries()].map(([key, value]) => ({ key, value })),
      leaves: leaveStatus,
      pendingLeaves: leaveStatus.pending,
      totalHours,
      workingHours,
    };
  }

  /* ── Reports (HR/admin) ── */

  async loginHistory(organizationId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { organizationId, action: 'auth.login' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { actorId: true, ip: true, userAgent: true, createdAt: true },
    });
    const ids = [...new Set(logs.map((l) => l.actorId).filter((x): x is string => !!x))];
    const users = ids.length
      ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } })
      : [];
    const nameOf = new Map(users.map((u) => [u.id, u.fullName]));
    return logs.map((l) => ({
      userName: l.actorId ? nameOf.get(l.actorId) ?? 'Unknown' : 'Unknown',
      ip: l.ip,
      userAgent: l.userAgent,
      at: l.createdAt,
    }));
  }

  async clearLoginHistory(organizationId: string): Promise<{ ok: true }> {
    await this.prisma.auditLog.deleteMany({ where: { organizationId, action: 'auth.login' } });
    return { ok: true };
  }

  async clearAttendanceHistory(organizationId: string): Promise<{ ok: true }> {
    const db = this.prisma.forTenant(organizationId);
    await db.attendance.deleteMany({});
    return { ok: true };
  }

  async attendanceHistory(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    const rows = await db.attendance.findMany({
      orderBy: { date: 'desc' },
      take: 100,
      include: { user: { select: { fullName: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      userName: r.user.fullName,
      date: r.date,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      status: r.status,
    }));
  }

  /* ── Holidays ── */

  async listHolidays(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    return db.holiday.findMany({ orderBy: { date: 'asc' } });
  }

  async createHoliday(organizationId: string, dto: { name: string; date: string }) {
    const db = this.prisma.forTenant(organizationId);
    return db.holiday.create({ data: { organizationId, name: dto.name.trim(), date: new Date(dto.date) } });
  }

  async removeHoliday(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    const h = await db.holiday.findFirst({ where: { id }, select: { id: true } });
    if (!h) throw new NotFoundException('Holiday not found');
    await db.holiday.delete({ where: { id } });
    return { ok: true };
  }
}
