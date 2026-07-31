import { Body, Controller, Delete, Get, Param, Patch, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import type { AuthUser } from '@gnevo/types';
import { UsersService } from './users.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const RoleSchema = z.object({ roleId: z.string().uuid() });
const CreateUserSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  roleKey: z.string().min(1).max(60),
  departmentId: z.string().uuid().nullable().optional(),
  teamId: z.string().uuid().nullable().optional(),
});
const ProfileSchema = z.object({
  designation: z.string().max(120).nullable().optional(),
  employeeId: z.string().max(60).nullable().optional(),
  joiningDate: z.string().nullable().optional(),
  reportingManagerId: z.string().uuid().nullable().optional(),
});

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions({ resource: 'user', action: 'view' })
  list(@CurrentUser() user: AuthUser) {
    return this.users.list(user.organizationId);
  }

  @Post()
  @RequirePermissions({ resource: 'user', action: 'create' })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateUserSchema)) dto: z.infer<typeof CreateUserSchema>,
  ) {
    return this.users.create({ id: user.id, roles: user.roles }, user.organizationId, dto);
  }

  // Self profile — any authenticated user (declared before :id to avoid capture).
  @Get('performance')
  @RequirePermissions({ resource: 'user', action: 'view' })
  performance(@CurrentUser() user: AuthUser) {
    return this.users.teamPerformance(user.organizationId);
  }

  @Get('me/profile')
  myProfile(@CurrentUser() user: AuthUser) {
    return this.users.getProfile(user.organizationId, user.id);
  }

  @Get('me/productivity')
  myProductivity(@CurrentUser() user: AuthUser) {
    return this.users.productivity(user.organizationId, user.id);
  }

  // Avatar — self upload/remove; anyone in the org can view an avatar image.
  @Post('me/avatar')
  setAvatar(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(z.object({ dataBase64: z.string().min(1), mimeType: z.string().min(1) })))
    dto: { dataBase64: string; mimeType: string },
  ) {
    return this.users.setAvatar(user.organizationId, user.id, dto.dataBase64, dto.mimeType);
  }

  @Delete('me/avatar')
  clearAvatar(@CurrentUser() user: AuthUser) {
    return this.users.clearAvatar(user.organizationId, user.id);
  }

  @Get(':id/avatar')
  async avatar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() res: Response): Promise<void> {
    const a = await this.users.getAvatar(user.organizationId, id);
    if (!a) {
      res.status(404).end();
      return;
    }
    res.setHeader('Content-Type', a.type);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.send(a.data);
  }

  @Get(':id/profile')
  @RequirePermissions({ resource: 'user', action: 'view' })
  profile(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.getProfile(user.organizationId, id);
  }

  @Get(':id/productivity')
  @RequirePermissions({ resource: 'user', action: 'view' })
  productivity(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.productivity(user.organizationId, id);
  }

  @Patch(':id/profile')
  @RequirePermissions({ resource: 'user', action: 'manage' })
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ProfileSchema)) dto: z.infer<typeof ProfileSchema>,
  ) {
    return this.users.updateProfile(user.organizationId, id, dto);
  }

  @Post(':id/role')
  @RequirePermissions({ resource: 'user', action: 'manage' })
  changeRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RoleSchema)) dto: { roleId: string },
  ) {
    return this.users.changeRole({ id: user.id, roles: user.roles }, user.organizationId, id, dto.roleId);
  }

  @Post(':id/suspend')
  @RequirePermissions({ resource: 'user', action: 'manage' })
  suspend(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.setStatus({ id: user.id }, user.organizationId, id, 'suspended');
  }

  @Post(':id/reactivate')
  @RequirePermissions({ resource: 'user', action: 'manage' })
  reactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.setStatus({ id: user.id }, user.organizationId, id, 'active');
  }

  @Post(':id/restore')
  @RequirePermissions({ resource: 'user', action: 'manage' })
  restore(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.restore({ id: user.id }, user.organizationId, id);
  }

  @Post('transfer-ownership')
  @RequirePermissions({ resource: 'user', action: 'manage' })
  transfer(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(z.object({ userId: z.string().uuid() }))) dto: { userId: string },
  ) {
    return this.users.transferOwnership({ id: user.id, roles: user.roles }, user.organizationId, dto.userId);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'user', action: 'manage' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.remove({ id: user.id }, user.organizationId, id);
  }
}
