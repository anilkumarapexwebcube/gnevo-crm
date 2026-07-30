import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { StructureService } from './structure.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const uuid = z.string().uuid();
const OfficeSchema = z.object({ name: z.string().min(1).max(120), timezone: z.string().max(60).optional() });
const OfficePatch = OfficeSchema.partial();
const DeptSchema = z.object({ name: z.string().min(1).max(120), officeId: uuid.optional(), managerId: uuid.optional() });
const DeptPatch = z.object({ name: z.string().min(1).max(120).optional(), officeId: uuid.nullable().optional(), managerId: uuid.nullable().optional() });
const TeamSchema = z.object({ name: z.string().min(1).max(120), departmentId: uuid.optional(), managerId: uuid.optional() });
const TeamPatch = z.object({ name: z.string().min(1).max(120).optional(), departmentId: uuid.nullable().optional(), managerId: uuid.nullable().optional() });
const AssignSchema = z.object({ departmentId: uuid.nullable().optional(), officeId: uuid.nullable().optional() });

@ApiTags('structure')
@Controller()
export class StructureController {
  constructor(private readonly structure: StructureService) {}

  @Get('structure')
  @RequirePermissions({ resource: 'department', action: 'view' })
  overview(@CurrentUser() user: AuthUser) {
    return this.structure.overview(user.organizationId);
  }

  // Offices
  @Post('offices')
  @RequirePermissions({ resource: 'office', action: 'manage' })
  createOffice(@CurrentUser() u: AuthUser, @Body(new ZodValidationPipe(OfficeSchema)) dto: z.infer<typeof OfficeSchema>) {
    return this.structure.createOffice(u.organizationId, dto);
  }
  @Patch('offices/:id')
  @RequirePermissions({ resource: 'office', action: 'manage' })
  updateOffice(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(new ZodValidationPipe(OfficePatch)) dto: z.infer<typeof OfficePatch>) {
    return this.structure.updateOffice(u.organizationId, id, dto);
  }
  @Delete('offices/:id')
  @RequirePermissions({ resource: 'office', action: 'manage' })
  removeOffice(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.structure.removeOffice(u.organizationId, id);
  }

  @Get('departments/:id/analytics')
  @RequirePermissions({ resource: 'department', action: 'view' })
  deptAnalytics(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.structure.departmentAnalytics(u.organizationId, id);
  }

  // Departments
  @Post('departments')
  @RequirePermissions({ resource: 'department', action: 'manage' })
  createDept(@CurrentUser() u: AuthUser, @Body(new ZodValidationPipe(DeptSchema)) dto: z.infer<typeof DeptSchema>) {
    return this.structure.createDepartment(u.organizationId, dto);
  }
  @Patch('departments/:id')
  @RequirePermissions({ resource: 'department', action: 'manage' })
  updateDept(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(new ZodValidationPipe(DeptPatch)) dto: z.infer<typeof DeptPatch>) {
    return this.structure.updateDepartment(u.organizationId, id, dto);
  }
  @Delete('departments/:id')
  @RequirePermissions({ resource: 'department', action: 'manage' })
  removeDept(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.structure.removeDepartment(u.organizationId, id);
  }

  // Teams
  @Post('teams')
  @RequirePermissions({ resource: 'team', action: 'manage' })
  createTeam(@CurrentUser() u: AuthUser, @Body(new ZodValidationPipe(TeamSchema)) dto: z.infer<typeof TeamSchema>) {
    return this.structure.createTeam(u.organizationId, dto);
  }
  @Patch('teams/:id')
  @RequirePermissions({ resource: 'team', action: 'manage' })
  updateTeam(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(new ZodValidationPipe(TeamPatch)) dto: z.infer<typeof TeamPatch>) {
    return this.structure.updateTeam(u.organizationId, id, dto);
  }
  @Delete('teams/:id')
  @RequirePermissions({ resource: 'team', action: 'manage' })
  removeTeam(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.structure.removeTeam(u.organizationId, id);
  }
  @Post('teams/:id/members')
  @RequirePermissions({ resource: 'team', action: 'manage' })
  addMember(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(new ZodValidationPipe(z.object({ userId: uuid }))) dto: { userId: string }) {
    return this.structure.addTeamMember(u.organizationId, id, dto.userId);
  }
  @Delete('teams/:id/members/:userId')
  @RequirePermissions({ resource: 'team', action: 'manage' })
  removeMember(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('userId') userId: string) {
    return this.structure.removeTeamMember(u.organizationId, id, userId);
  }

  // Assign a member's department + office
  @Post('users/:id/assignment')
  @RequirePermissions({ resource: 'user', action: 'manage' })
  assign(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(new ZodValidationPipe(AssignSchema)) dto: z.infer<typeof AssignSchema>) {
    return this.structure.assignUser(u.organizationId, id, dto);
  }
}
