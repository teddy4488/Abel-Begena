import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserType } from './auth.service';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Request() req: { user: { sub: string; userType?: string } },
  ) {
    return this.authService.changePassword(req.user.sub, req.user.userType as UserType | undefined, dto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 300_000 } })  // 5 attempts per 5 minutes
  login(
    @Request() req: { user: Record<string, unknown> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user, userId, expiresAt } =
      this.authService.login(req.user);

    // Set an httpOnly cookie for desktop browsers and environments where
    // cross-site cookies are allowed, but also return the token in the JSON
    // payload so that mobile browsers (especially Safari) that block
    // third-party cookies can authenticate using an Authorization header.
    this.setSessionCookie(res, accessToken);
    // Persist and set refresh token cookie for silent re-auth / rotation.
    void this.authService.persistRefreshToken(
      userId,
      (user as { userType?: UserType })?.userType ?? 'website_user',
      refreshToken,
    );
    this.setRefreshCookie(res, refreshToken);

    return { user, expiresAt, accessToken };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @Request() req: { user: { sub: string; userType?: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    this.clearSessionCookie(res);
    this.clearRefreshCookie(res);
    void this.authService.clearRefreshToken(
      req.user.sub,
      (req.user.userType as UserType | undefined) ?? 'website_user',
    );
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })  // 20 refreshes per minute
  async refresh(
    @Request() req: { cookies?: Record<string, string | undefined> },
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    const token = req.cookies?.refresh_token;
    const { accessToken, refreshToken, expiresAt, user } =
      await this.authService.refreshSession(token ?? '');
    this.setSessionCookie(res, accessToken);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, expiresAt, user };
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  async session(
    @Request() req: {
      user: { sub: string; exp?: number; userType?: string };
    },
  ): Promise<unknown> {
    const userType = req.user.userType as
      | 'website_user'
      | 'teacher'
      | 'admin'
      | 'student'
      | undefined;
    const user = await this.authService.getSession(req.user.sub, userType);
    const expiresAt = req.user.exp
      ? new Date(req.user.exp * 1000).toISOString()
      : null;
    return { user, expiresAt };
  }

  private setSessionCookie(res: Response, token: string) {
    res.cookie('access_token', token, {
      httpOnly: true,
      // In production, frontend (Vercel) and backend (Render) are on different domains.
      // To allow the browser to send this cookie on cross-site XHR/fetch requests,
      // we must use SameSite=None; Secure.
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private clearSessionCookie(res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
}
