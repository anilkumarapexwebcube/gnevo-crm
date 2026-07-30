import { Body, Controller, Delete, ForbiddenException, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { HrService } from './hr.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const LeaveSchema = z.object({
  type: z.enum(['casual', 'sick', 'paid', 'unpaid', 'wfh']),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().max(500).optional(),
});
const DecideSchema = z.object({ status: z.enum(['approved', 'rejected']) });
const HolidaySchema = z.object({ name: z.string().min(1).max(120), date: z.string() });

function requireHr(user: AuthUser) {
  if (!user.roles.some((r) => r === 'owner' || r === 'admin' || r === 'hr')) {
    throw new ForbiddenException('Only HR, admins or the owner can do this');
  }
}

@ApiTags('hr')
@Controller('hr')
export class HrController {
  constructor(private readonly hr: HrService) {}

  // Attendance (self)
  @Post('attendance/clock-in')
  clockIn(@CurrentUser() u: AuthUser) {
    return this.hr.clockIn(u.organizationId, u.id);
  }
  @Post('attendance/clock-out')
  clockOut(@CurrentUser() u: AuthUser) {
    return this.hr.clockOut(u.organizationId, u.id);
  }
  @Get('attendance/today')
  today(@CurrentUser() u: AuthUser) {
    return this.hr.today(u.organizationId, u.id);
  }
  @Get('attendance/me')
  myAttendance(@CurrentUser() u: AuthUser) {
    return this.hr.myAttendance(u.organizationId, u.id);
  }

  // Leave
  @Post('leaves')
  submitLeave(@CurrentUser() u: AuthUser, @Body(new ZodValidationPipe(LeaveSchema)) dto: z.infer<typeof LeaveSchema>) {
    return this.hr.submitLeave(u.organizationId, { id: u.id, name: u.fullName }, dto);
  }
  @Get('leaves/me')
  myLeaves(@CurrentUser() u: AuthUser) {
    return this.hr.myLeaves(u.organizationId, u.id);
  }
  @Get('leaves')
  allLeaves(@CurrentUser() u: AuthUser) {
    requireHr(u);
    return this.hr.allLeaves(u.organizationId);
  }
  @Post('leaves/:id/decide')
  decide(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(new ZodValidationPipe(DecideSchema)) dto: { status: 'approved' | 'rejected' }) {
    requireHr(u);
    return this.hr.decideLeave(u.organizationId, { id: u.id, name: u.fullName }, id, dto.status);
  }
  @Post('leaves/:id/cancel')
  cancel(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.hr.cancelLeave(u.organizationId, u.id, id);
  }

  // Analytics (HR/admin)
  @Get('analytics')
  analytics(@CurrentUser() u: AuthUser) {
    requireHr(u);
    return this.hr.analytics(u.organizationId);
  }

  @Get('reports/logins')
  loginHistory(@CurrentUser() u: AuthUser) {
    requireHr(u);
    return this.hr.loginHistory(u.organizationId);
  }

  @Get('reports/attendance')
  attendanceHistory(@CurrentUser() u: AuthUser) {
    requireHr(u);
    return this.hr.attendanceHistory(u.organizationId);
  }

  @Delete('reports/logins')
  clearLogins(@CurrentUser() u: AuthUser) {
    requireHr(u);
    return this.hr.clearLoginHistory(u.organizationId);
  }

  @Delete('reports/attendance')
  clearAttendance(@CurrentUser() u: AuthUser) {
    requireHr(u);
    return this.hr.clearAttendanceHistory(u.organizationId);
  }

  // Holidays
  @Get('holidays')
  holidays(@CurrentUser() u: AuthUser) {
    return this.hr.listHolidays(u.organizationId);
  }
  @Post('holidays')
  addHoliday(@CurrentUser() u: AuthUser, @Body(new ZodValidationPipe(HolidaySchema)) dto: z.infer<typeof HolidaySchema>) {
    requireHr(u);
    return this.hr.createHoliday(u.organizationId, dto);
  }
  @Delete('holidays/:id')
  removeHoliday(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    requireHr(u);
    return this.hr.removeHoliday(u.organizationId, id);
  }
}
