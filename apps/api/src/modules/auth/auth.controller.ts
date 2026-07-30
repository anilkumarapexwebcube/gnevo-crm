import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { z } from 'zod';
import { SessionId } from '../../common/decorators/session-id.decorator.js';
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  type AuthUser,
  type LoginRequest,
  type RegisterRequest,
} from '@gnevo/types';
import { AuthService } from './auth.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const UpdateProfileSchema = z
  .object({
    fullName: z.string().min(1).max(120).optional(),
    email: z.string().email().optional(),
  })
  .refine((v) => v.fullName !== undefined || v.email !== undefined, {
    message: 'Nothing to update',
  });

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const TwoFactorCodeSchema = z.object({
  code: z.string().min(6).max(8),
});

const MagicRequestSchema = z.object({ email: z.string().email() });
const MagicVerifySchema = z.object({ token: z.string().min(10) });

const ResetRequestSchema = z.object({ email: z.string().email() });
const ResetVerifySchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
});

const PasskeyRegisterVerifySchema = z.object({
  response: z.record(z.unknown()),
  state: z.string().min(10),
  name: z.string().max(60).optional(),
});
const Passkey2faOptionsSchema = z.object({ mfaToken: z.string().min(10) });
const Passkey2faVerifySchema = z.object({
  mfaToken: z.string().min(10),
  response: z.record(z.unknown()),
  state: z.string().min(10),
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body(new ZodValidationPipe(RegisterRequestSchema)) dto: RegisterRequest) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(LoginRequestSchema)) dto: LoginRequest, @Req() req: Request) {
    return this.auth.login(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('magic-link/request')
  @HttpCode(200)
  requestMagicLink(@Body(new ZodValidationPipe(MagicRequestSchema)) dto: { email: string }) {
    return this.auth.requestMagicLink(dto.email);
  }

  @Public()
  @Post('magic-link/verify')
  @HttpCode(200)
  verifyMagicLink(
    @Body(new ZodValidationPipe(MagicVerifySchema)) dto: { token: string },
    @Req() req: Request,
  ) {
    return this.auth.verifyMagicLink(dto.token, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(200)
  requestPasswordReset(@Body(new ZodValidationPipe(ResetRequestSchema)) dto: { email: string }) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('password-reset/verify')
  @HttpCode(200)
  resetPassword(
    @Body(new ZodValidationPipe(ResetVerifySchema)) dto: { token: string; newPassword: string },
  ) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(UpdateProfileSchema))
    dto: { fullName?: string; email?: string },
  ) {
    return this.auth.updateProfile(user.id, dto);
  }

  @Post('change-password')
  @HttpCode(200)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ChangePasswordSchema))
    dto: { currentPassword: string; newPassword: string },
  ) {
    return this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('2fa/setup')
  @HttpCode(200)
  setupTwoFactor(@CurrentUser() user: AuthUser) {
    return this.auth.setupTwoFactor(user.id);
  }

  @Post('2fa/enable')
  @HttpCode(200)
  enableTwoFactor(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(TwoFactorCodeSchema)) dto: { code: string },
  ) {
    return this.auth.enableTwoFactor(user.id, dto.code);
  }

  @Post('2fa/disable')
  @HttpCode(200)
  disableTwoFactor(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(TwoFactorCodeSchema)) dto: { code: string },
  ) {
    return this.auth.disableTwoFactor(user.id, dto.code);
  }

  // ── WebAuthn passkeys ──

  @Post('passkey/register/options')
  @HttpCode(200)
  passkeyRegisterOptions(@CurrentUser() user: AuthUser) {
    return this.auth.passkeyRegisterOptions(user.id);
  }

  @Post('passkey/register/verify')
  @HttpCode(200)
  passkeyRegisterVerify(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(PasskeyRegisterVerifySchema))
    dto: { response: Record<string, unknown>; state: string; name?: string },
  ) {
    return this.auth.passkeyRegisterVerify(user.id, dto.response, dto.state, dto.name);
  }

  @Get('passkey')
  listPasskeys(@CurrentUser() user: AuthUser) {
    return this.auth.listPasskeys(user.id);
  }

  @Delete('passkey/:id')
  @HttpCode(200)
  removePasskey(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.auth.removePasskey(user.id, id);
  }

  @Public()
  @Post('passkey/2fa/options')
  @HttpCode(200)
  passkey2faOptions(
    @Body(new ZodValidationPipe(Passkey2faOptionsSchema)) dto: { mfaToken: string },
  ) {
    return this.auth.passkey2faOptions(dto.mfaToken);
  }

  @Public()
  @Post('passkey/2fa/verify')
  @HttpCode(200)
  passkey2faVerify(
    @Body(new ZodValidationPipe(Passkey2faVerifySchema))
    dto: { mfaToken: string; response: Record<string, unknown>; state: string },
    @Req() req: Request,
  ) {
    return this.auth.passkey2faVerify(dto.mfaToken, dto.response, dto.state, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('sessions')
  listSessions(@CurrentUser() user: AuthUser, @SessionId() sid?: string) {
    return this.auth.listSessions(user.id, sid);
  }

  @Get('login-history')
  loginHistory(@CurrentUser() user: AuthUser) {
    return this.auth.myLoginHistory(user.organizationId, user.id);
  }

  @Delete('sessions/:id')
  @HttpCode(200)
  revokeSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.auth.revokeSession(user.id, id);
  }

  @Post('sessions/revoke-all')
  @HttpCode(200)
  revokeAllSessions(@CurrentUser() user: AuthUser) {
    return this.auth.revokeAllSessions(user.id);
  }
}
