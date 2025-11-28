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

  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(
    @Request() req: { user: Record<string, unknown> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, user, expiresAt } = this.authService.login(req.user);
    this.setSessionCookie(res, accessToken);
    return { user, expiresAt };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Res({ passthrough: true }) res: Response) {
    this.clearSessionCookie(res);
    return { message: 'Logged out successfully' };
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  async session(@Request() req: { user: { sub: string; exp?: number } }) {
    const user = await this.authService.getSession(req.user.sub);
    const expiresAt = req.user.exp
      ? new Date(req.user.exp * 1000).toISOString()
      : null;
    return { user, expiresAt };
  }

  private setSessionCookie(res: Response, token: string) {
    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 2 * 60 * 60 * 1000,
    });
  }

  private clearSessionCookie(res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
}
