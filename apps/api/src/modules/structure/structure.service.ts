import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SYSTEM_ROLE_NAMES } from '@gnevo/auth';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../events/notifications.service.js';

const ROLE_RANK = ['viewer', 'member', 'manager', 'hr', 'admin', 'owner'];
const primaryKey = (keys: string[]) =>
  keys.slice().sort((a, b) => ROLE_RANK.indexOf(b) - ROLE_RANK.indexOf(a))[0] ?? 'member';

@Injectable()
export class StructureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Consolidated payload for the org-structure page. */
  async overview(organizationId: string) {
    const db = this.prisma.forTenant(organizationId);
    const [offices, departments, teams, members, memberships] = await Promise.all([
      db.office.findMany({ orderBy: { name: 'asc' } }),
      db.department.findMany({ orderBy: { name: 'asc' } }),
      db.team.findMany({ orderBy: { name: 'asc' } }),
      db.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true, fullName: true, email: true, departmentId: true, officeId: true,
          designation: true, reportingManagerId: true,
          roles: { select: { role: { select: { key: true } } } },
        },
      }),
      this.prisma.teamMember.findMany({ where: { team: { organizationId } }, select: { teamId: true, userId: true } }),
    ]);

    const nameOf = new Map(members.map((m) => [m.id, m.fullName]));
    const teamMembers = new Map<string, string[]>();
    for (const tm of memberships) {
      const arr = teamMembers.get(tm.teamId) ?? [];
      arr.push(tm.userId);
      teamMembers.set(tm.teamId, arr);
    }

    return {
      offices: offices.map((o) => ({
        id: o.id,
        name: o.name,
        timezone: o.timezone,
        departmentCount: departments.filter((d) => d.officeId === o.id).length,
        memberCount: members.filter((m) => m.officeId === o.id).length,
      })),
      departments: departments.map((d) => ({
        id: d.id,
        name: d.name,
        officeId: d.officeId,
        officeName: offices.find((o) => o.id === d.officeId)?.name ?? null,
        managerId: d.managerId,
        managerName: d.managerId ? nameOf.get(d.managerId) ?? null : null,
        memberCount: members.filter((m) => m.departmentId === d.id).length,
      })),
      teams: teams.map((t) => {
        const ids = teamMembers.get(t.id) ?? [];
        return {
          id: t.id,
          name: t.name,
          departmentId: t.departmentId,
          departmentName: departments.find((d) => d.id === t.departmentId)?.name ?? null,
          managerId: t.managerId,
          managerName: t.managerId ? nameOf.get(t.managerId) ?? null : null,
          members: ids.map((uid) => ({ id: uid, name: nameOf.get(uid) ?? 'Unknown' })),
        };
      }),
      members: members.map((m) => {
        const roleKey = primaryKey(m.roles.map((r) => r.role.key));
        return {
          id: m.id,
          fullName: m.fullName,
          email: m.email,
          departmentId: m.departmentId,
          officeId: m.officeId,
          designation: m.designation,
          reportingManagerId: m.reportingManagerId,
          roleKey,
          roleName: SYSTEM_ROLE_NAMES[roleKey as keyof typeof SYSTEM_ROLE_NAMES] ?? roleKey,
          isOwner: m.roles.some((r) => r.role.key === 'owner'),
        };
      }),
    };
  }

  /** Per-department dashboard: people, teams, and task throughput. */
  async departmentAnalytics(organizationId: string, departmentId: string) {
    const db = this.prisma.forTenant(organizationId);
    const dept = await db.department.findFirst({
      where: { id: departmentId },
      select: { id: true, name: true, managerId: true, office: { select: { name: true } } },
    });
    if (!dept) throw new NotFoundException('Department not found');

    const [members, teams, memberships] = await Promise.all([
      db.user.findMany({
        where: { departmentId, deletedAt: null, status: 'active' },
        select: { id: true, fullName: true, roles: { select: { role: { select: { key: true } } } } },
      }),
      db.team.findMany({ where: { departmentId }, select: { id: true, name: true } }),
      this.prisma.teamMember.findMany({ where: { team: { departmentId } }, select: { teamId: true } }),
    ]);

    const memberIds = members.map((m) => m.id);
    const tasks = memberIds.length
      ? await db.task.findMany({
          where: { assigneeId: { in: memberIds }, deletedAt: null },
          select: { status: true, dueDate: true },
        })
      : [];
    const now = new Date();
    const done = tasks.filter((t) => t.status === 'done').length;
    const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < now).length;
    const teamCount = new Map<string, number>();
    for (const m of memberships) teamCount.set(m.teamId, (teamCount.get(m.teamId) ?? 0) + 1);

    const managerName = dept.managerId
      ? (await db.user.findFirst({ where: { id: dept.managerId }, select: { fullName: true } }))?.fullName ?? null
      : null;

    return {
      id: dept.id,
      name: dept.name,
      office: dept.office?.name ?? null,
      managerName,
      memberCount: members.length,
      teamCount: teams.length,
      members: members.map((m) => ({
        id: m.id,
        name: m.fullName,
        role: SYSTEM_ROLE_NAMES[primaryKey(m.roles.map((r) => r.role.key)) as keyof typeof SYSTEM_ROLE_NAMES] ?? 'Member',
      })),
      teams: teams.map((t) => ({ id: t.id, name: t.name, members: teamCount.get(t.id) ?? 0 })),
      tasks: {
        total: tasks.length,
        done,
        overdue,
        completion: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      },
    };
  }

  /* ── Offices ── */
  async createOffice(organizationId: string, dto: { name: string; timezone?: string }) {
    const db = this.prisma.forTenant(organizationId);
    return db.office.create({ data: { organizationId, name: dto.name.trim(), timezone: dto.timezone?.trim() || 'UTC' } });
  }
  async updateOffice(organizationId: string, id: string, dto: { name?: string; timezone?: string }) {
    const db = this.prisma.forTenant(organizationId);
    if (!(await db.office.findFirst({ where: { id }, select: { id: true } }))) throw new NotFoundException('Office not found');
    return db.office.update({ where: { id }, data: { ...(dto.name ? { name: dto.name.trim() } : {}), ...(dto.timezone ? { timezone: dto.timezone.trim() } : {}) } });
  }
  async removeOffice(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    if (!(await db.office.findFirst({ where: { id }, select: { id: true } }))) throw new NotFoundException('Office not found');
    await db.office.delete({ where: { id } });
    return { ok: true };
  }

  /* ── Departments ── */
  async createDepartment(organizationId: string, dto: { name: string; officeId?: string; managerId?: string }) {
    const db = this.prisma.forTenant(organizationId);
    return db.department.create({ data: { organizationId, name: dto.name.trim(), officeId: dto.officeId ?? null, managerId: dto.managerId ?? null } });
  }
  async updateDepartment(organizationId: string, id: string, dto: { name?: string; officeId?: string | null; managerId?: string | null }) {
    const db = this.prisma.forTenant(organizationId);
    if (!(await db.department.findFirst({ where: { id }, select: { id: true } }))) throw new NotFoundException('Department not found');
    return db.department.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.officeId !== undefined ? { officeId: dto.officeId || null } : {}),
        ...(dto.managerId !== undefined ? { managerId: dto.managerId || null } : {}),
      },
    });
  }
  async removeDepartment(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    if (!(await db.department.findFirst({ where: { id }, select: { id: true } }))) throw new NotFoundException('Department not found');
    await db.department.delete({ where: { id } });
    return { ok: true };
  }

  /* ── Teams ── */
  async createTeam(organizationId: string, dto: { name: string; departmentId?: string; managerId?: string }) {
    const db = this.prisma.forTenant(organizationId);
    return db.team.create({ data: { organizationId, name: dto.name.trim(), departmentId: dto.departmentId ?? null, managerId: dto.managerId ?? null } });
  }
  async updateTeam(organizationId: string, id: string, dto: { name?: string; departmentId?: string | null; managerId?: string | null }) {
    const db = this.prisma.forTenant(organizationId);
    if (!(await db.team.findFirst({ where: { id }, select: { id: true } }))) throw new NotFoundException('Team not found');
    return db.team.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId || null } : {}),
        ...(dto.managerId !== undefined ? { managerId: dto.managerId || null } : {}),
      },
    });
  }
  async removeTeam(organizationId: string, id: string) {
    const db = this.prisma.forTenant(organizationId);
    if (!(await db.team.findFirst({ where: { id }, select: { id: true } }))) throw new NotFoundException('Team not found');
    await db.team.delete({ where: { id } });
    return { ok: true };
  }

  private async assertTeam(organizationId: string, teamId: string) {
    const db = this.prisma.forTenant(organizationId);
    const team = await db.team.findFirst({ where: { id: teamId }, select: { id: true } });
    if (!team) throw new NotFoundException('Team not found');
  }

  async addTeamMember(organizationId: string, teamId: string, userId: string) {
    await this.assertTeam(organizationId, teamId);
    const db = this.prisma.forTenant(organizationId);
    const user = await db.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true } });
    if (!user) throw new BadRequestException('User not found');
    await this.prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId } },
      update: {},
      create: { teamId, userId },
    });
    const team = await db.team.findFirst({ where: { id: teamId }, select: { name: true } });
    await this.notifications.notify(organizationId, userId, {
      title: 'Added to a team',
      body: `You were added to the ${team?.name ?? 'team'} team.`,
      link: '/structure',
      type: 'team',
    });
    return { ok: true };
  }
  async removeTeamMember(organizationId: string, teamId: string, userId: string) {
    await this.assertTeam(organizationId, teamId);
    await this.prisma.teamMember.deleteMany({ where: { teamId, userId } });
    return { ok: true };
  }

  /** Set a member's primary department + office. */
  async assignUser(organizationId: string, userId: string, dto: { departmentId?: string | null; officeId?: string | null }) {
    const db = this.prisma.forTenant(organizationId);
    const user = await db.user.findFirst({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId || null } : {}),
        ...(dto.officeId !== undefined ? { officeId: dto.officeId || null } : {}),
      },
      select: { id: true, department: { select: { name: true } } },
    });
    if (dto.departmentId !== undefined) {
      await this.notifications.notify(organizationId, userId, {
        title: 'Your department changed',
        body: updated.department ? `You were moved to ${updated.department.name}.` : 'You were removed from your department.',
        link: '/profile',
        type: 'team',
      });
    }
    return { id: updated.id };
  }
}
