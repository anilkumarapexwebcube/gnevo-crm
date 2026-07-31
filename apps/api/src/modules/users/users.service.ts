import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SYSTEM_ROLE_NAMES, hashPassword } from '@gnevo/auth';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ensureSystemRole } from '../../common/ensure-role.js';
import { AuditService } from '../events/audit.service.js';
import { NotificationsService } from '../events/notifications.service.js';

const ROLE_RANK = ['viewer', 'member', 'manager', 'admin', 'owner'];
const primaryKey = (keys: string[]) =>
  keys.slice().sort((a, b) => ROLE_RANK.indexOf(b) - ROLE_RANK.indexOf(a))[0] ?? 'member';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Create a staff account directly (admin sets a temporary password) — the
   * alternative to the email-invite flow, useful when email delivery is down or
   * for quick onboarding. The user is active immediately and can change their
   * password from Settings.
   */
  async create(
    actor: { id: string; roles: string[] },
    organizationId: string,
    dto: { fullName: string; email: string; password: string; roleKey: string; departmentId?: string | null; teamId?: string | null },
  ) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    if (!email || !fullName) throw new BadRequestException('Name and email are required');
    if (dto.roleKey === 'owner') throw new ForbiddenException('The Owner role cannot be assigned here');
    const existing = await this.prisma.user.findFirst({
      where: { organizationId, email, deletedAt: null },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('A user with this email already exists');

    const roleId = await ensureSystemRole(this.prisma, organizationId, dto.roleKey);
    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email,
        fullName,
        passwordHash,
        status: 'active',
        departmentId: dto.departmentId || null,
        roles: { create: { roleId } },
        ...(dto.teamId ? { teams: { create: { teamId: dto.teamId } } } : {}),
      },
      select: { id: true, email: true, fullName: true },
    });
    await this.audit.record(organizationId, {
      actorId: actor.id,
      action: 'user.created',
      resource: 'user',
      resourceId: user.id,
      after: { email, roleKey: dto.roleKey },
    });
    return user;
  }

  async list(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      orderBy: [{ deletedAt: 'asc' }, { fullName: 'asc' }],
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        deletedAt: true,
        createdAt: true,
        department: { select: { name: true } },
        avatarType: true,
        roles: { select: { role: { select: { id: true, key: true, name: true } } } },
      },
    });
    return users.map((u) => {
      const roleList = u.roles.map((r) => r.role);
      const keys = roleList.map((r) => r.key);
      const roleKey = primaryKey(keys);
      const primary = roleList.find((r) => r.key === roleKey) ?? roleList[0];
      const systemName = SYSTEM_ROLE_NAMES[roleKey as keyof typeof SYSTEM_ROLE_NAMES];
      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        status: u.deletedAt ? 'deleted' : u.status,
        roleId: primary?.id ?? null,
        roleKey,
        roleName: systemName ?? primary?.name ?? roleKey,
        department: u.department?.name ?? null,
        createdAt: u.createdAt,
        isOwner: keys.includes('owner'),
        hasAvatar: !!u.avatarType,
      };
    });
  }

  private async target(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: { id: true, fullName: true, email: true, status: true, deletedAt: true, roles: { select: { role: { select: { key: true } } } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return { ...user, keys: user.roles.map((r) => r.role.key) };
  }

  /** Active users with owner/admin — used for the "last admin" guard. */
  private async adminCount(organizationId: string): Promise<number> {
    const admins = await this.prisma.user.findMany({
      where: { organizationId, deletedAt: null, status: 'active', roles: { some: { role: { key: { in: ['owner', 'admin'] } } } } },
      select: { id: true },
    });
    return admins.length;
  }

  private async revokeSessions(userId: string) {
    await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  private async setRoleByKey(organizationId: string, userId: string, roleKey: string) {
    const roleId = await ensureSystemRole(this.prisma, organizationId, roleKey);
    await this.setRoleById(userId, roleId);
  }

  private async setRoleById(userId: string, roleId: string) {
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      this.prisma.userRole.create({ data: { userId, roleId } }),
    ]);
  }

  /** Who may assign a given role: admin → owner only; hr → owner/admin; the rest → owner/admin/hr. */
  private assertCanAssign(actorRoles: string[], roleKey: string) {
    const isOwner = actorRoles.includes('owner');
    const isAdmin = actorRoles.includes('admin');
    if (roleKey === 'admin' && !isOwner) {
      throw new ForbiddenException('Only the owner can promote to or demote from Admin');
    }
    if (roleKey === 'hr' && !(isOwner || isAdmin)) {
      throw new ForbiddenException('Only the owner or an admin can assign the HR role');
    }
  }

  async changeRole(actor: { id: string; roles: string[] }, organizationId: string, id: string, roleId: string) {
    if (id === actor.id) throw new ForbiddenException("You can't change your own role");
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
      select: { id: true, key: true, name: true },
    });
    if (!role) throw new BadRequestException('Role not found');
    if (role.key === 'owner') throw new ForbiddenException('Use transfer ownership to make someone the owner');

    const t = await this.target(organizationId, id);
    if (t.keys.includes('owner')) throw new ForbiddenException("The owner's role can't be changed here — use transfer ownership");

    this.assertCanAssign(actor.roles, role.key);
    // Demoting an existing admin also requires owner rights + last-admin guard.
    if (t.keys.includes('admin') && role.key !== 'admin') {
      if (!actor.roles.includes('owner')) throw new ForbiddenException('Only the owner can demote an admin');
      if ((await this.adminCount(organizationId)) <= 1) throw new BadRequestException('Cannot demote the last admin');
    }
    await this.setRoleById(id, role.id);
    await this.audit.record(organizationId, { actorId: actor.id, action: 'user.role_changed', resource: 'user', resourceId: id, after: { roleKey: role.key } });
    await this.notifications.notify(organizationId, id, {
      title: 'Your role was updated',
      body: `You are now ${SYSTEM_ROLE_NAMES[role.key as keyof typeof SYSTEM_ROLE_NAMES] ?? role.name}.`,
      type: 'team',
    });
    return { ok: true };
  }

  async setStatus(actor: { id: string }, organizationId: string, id: string, status: 'active' | 'suspended') {
    if (id === actor.id) throw new ForbiddenException("You can't change your own status");
    const t = await this.target(organizationId, id);
    if (t.keys.includes('owner')) throw new ForbiddenException("The owner can't be suspended");
    if (status === 'suspended' && t.keys.includes('admin') && (await this.adminCount(organizationId)) <= 1) {
      throw new BadRequestException('Cannot suspend the last admin');
    }
    await this.prisma.user.update({ where: { id }, data: { status } });
    if (status === 'suspended') await this.revokeSessions(id);
    await this.audit.record(organizationId, { actorId: actor.id, action: status === 'suspended' ? 'user.suspended' : 'user.reactivated', resource: 'user', resourceId: id });
    await this.notifications.notify(organizationId, id, {
      title: status === 'suspended' ? 'Your account was suspended' : 'Your account was reactivated',
      body: status === 'suspended' ? 'Contact your workspace admin for details.' : 'Welcome back — you can sign in again.',
      type: 'account',
    });
    return { ok: true };
  }

  async remove(actor: { id: string }, organizationId: string, id: string) {
    if (id === actor.id) throw new ForbiddenException("You can't delete your own account");
    const t = await this.target(organizationId, id);
    if (t.keys.includes('owner')) throw new ForbiddenException('The workspace owner cannot be deleted');
    if (t.keys.includes('admin') && (await this.adminCount(organizationId)) <= 1) {
      throw new BadRequestException('Cannot delete the last admin');
    }
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'inactive' } });
    await this.revokeSessions(id);
    await this.audit.record(organizationId, { actorId: actor.id, action: 'user.deleted', resource: 'user', resourceId: id, before: { email: t.email } });
    await this.notifications.notify(organizationId, id, {
      title: 'Your account was removed',
      body: 'Your access to this workspace has been revoked.',
      type: 'account',
    });
    return { ok: true };
  }

  async restore(actor: { id: string }, organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id }, data: { deletedAt: null, status: 'active' } });
    await this.audit.record(organizationId, { actorId: actor.id, action: 'user.restored', resource: 'user', resourceId: id });
    return { ok: true };
  }

  async transferOwnership(actor: { id: string; roles: string[] }, organizationId: string, id: string) {
    if (!actor.roles.includes('owner')) throw new ForbiddenException('Only the current owner can transfer ownership');
    if (id === actor.id) throw new BadRequestException('You are already the owner');
    const t = await this.target(organizationId, id);
    if (t.deletedAt || t.status !== 'active') throw new BadRequestException('New owner must be an active member');

    await this.setRoleByKey(organizationId, id, 'owner');
    await this.setRoleByKey(organizationId, actor.id, 'admin');
    await this.audit.record(organizationId, { actorId: actor.id, action: 'workspace.ownership_transferred', resource: 'organization', resourceId: id, after: { newOwnerId: id } });
    await this.notifications.notify(organizationId, id, {
      title: 'You are now the workspace owner',
      body: 'Ownership of the workspace was transferred to you.',
      link: '/directory',
      type: 'team',
    });
    return { ok: true };
  }

  /* ── Employee profile (Phase 5) ── */

  async getProfile(organizationId: string, id: string) {
    const u = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: {
        id: true, fullName: true, email: true, status: true, createdAt: true,
        designation: true, employeeId: true, joiningDate: true, reportingManagerId: true,
        department: { select: { id: true, name: true } },
        office: { select: { id: true, name: true } },
        roles: { select: { role: { select: { key: true, name: true } } } },
        teams: { select: { team: { select: { id: true, name: true } } } },
        avatarType: true,
      },
    });
    if (!u) throw new NotFoundException('User not found');
    const manager = u.reportingManagerId
      ? await this.prisma.user.findFirst({ where: { id: u.reportingManagerId }, select: { fullName: true } })
      : null;
    const roleKey = primaryKey(u.roles.map((r) => r.role.key));
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      status: u.status,
      roleKey,
      roleName: SYSTEM_ROLE_NAMES[roleKey as keyof typeof SYSTEM_ROLE_NAMES] ?? roleKey,
      designation: u.designation,
      employeeId: u.employeeId,
      joiningDate: u.joiningDate,
      reportingManagerId: u.reportingManagerId,
      reportingManagerName: manager?.fullName ?? null,
      department: u.department,
      office: u.office,
      teams: u.teams.map((t) => t.team),
      hasAvatar: !!u.avatarType,
      createdAt: u.createdAt,
    };
  }

  async updateProfile(
    organizationId: string,
    id: string,
    dto: { designation?: string | null; employeeId?: string | null; joiningDate?: string | null; reportingManagerId?: string | null },
  ) {
    const u = await this.prisma.user.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!u) throw new NotFoundException('User not found');
    if (dto.reportingManagerId && dto.reportingManagerId === id) {
      throw new BadRequestException('A user cannot report to themselves');
    }
    await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.designation !== undefined ? { designation: dto.designation || null } : {}),
        ...(dto.employeeId !== undefined ? { employeeId: dto.employeeId || null } : {}),
        ...(dto.joiningDate !== undefined ? { joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null } : {}),
        ...(dto.reportingManagerId !== undefined ? { reportingManagerId: dto.reportingManagerId || null } : {}),
      },
    });
    return { ok: true };
  }

  /* ── Avatar ── */

  async setAvatar(organizationId: string, userId: string, dataBase64: string, mimeType: string) {
    if (!mimeType.startsWith('image/')) throw new BadRequestException('Only image files are allowed');
    const buf = Buffer.from(dataBase64, 'base64');
    if (buf.length === 0) throw new BadRequestException('The image appears to be empty');
    if (buf.length > 1024 * 1024) throw new BadRequestException('Avatar must be 1 MB or smaller');
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id: userId }, data: { avatarData: buf, avatarType: mimeType } });
    return { ok: true };
  }

  async clearAvatar(organizationId: string, userId: string) {
    await this.prisma.user.updateMany({ where: { id: userId, organizationId }, data: { avatarData: null, avatarType: null } });
    return { ok: true };
  }

  async getAvatar(organizationId: string, userId: string): Promise<{ data: Buffer; type: string } | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { avatarData: true, avatarType: true },
    });
    if (!user?.avatarData) return null;
    return { data: Buffer.from(user.avatarData), type: user.avatarType ?? 'image/png' };
  }

  /** Per-member task completion leaderboard for the whole workspace. */
  async teamPerformance(organizationId: string) {
    const [members, tasks] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId, deletedAt: null, status: 'active' },
        select: { id: true, fullName: true },
      }),
      this.prisma.task.findMany({
        where: { organizationId, deletedAt: null, assigneeId: { not: null } },
        select: { assigneeId: true, status: true, dueDate: true },
      }),
    ]);
    const now = new Date();
    const stat = new Map<string, { total: number; done: number; overdue: number }>();
    for (const t of tasks) {
      if (!t.assigneeId) continue;
      const s = stat.get(t.assigneeId) ?? { total: 0, done: 0, overdue: 0 };
      s.total += 1;
      if (t.status === 'done') s.done += 1;
      else if (t.dueDate && new Date(t.dueDate) < now) s.overdue += 1;
      stat.set(t.assigneeId, s);
    }
    return members
      .map((m) => {
        const s = stat.get(m.id) ?? { total: 0, done: 0, overdue: 0 };
        return { id: m.id, name: m.fullName, total: s.total, done: s.done, overdue: s.overdue, completion: s.total ? Math.round((s.done / s.total) * 100) : 0 };
      })
      .sort((a, b) => b.done - a.done || b.total - a.total);
  }

  /** Simple per-employee productivity snapshot. */
  async productivity(organizationId: string, id: string) {
    const tasks = await this.prisma.task.findMany({
      where: { organizationId, assigneeId: id, deletedAt: null },
      select: { status: true, dueDate: true },
    });
    const now = new Date();
    const done = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < now).length;
    const total = tasks.length;
    return {
      tasksTotal: total,
      tasksDone: done,
      tasksInProgress: inProgress,
      tasksTodo: todo,
      tasksOverdue: overdue,
      completionRate: total ? Math.round((done / total) * 100) : 0,
    };
  }
}
