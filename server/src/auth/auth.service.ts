import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { MailService } from '../mail/mail.service';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Injectable()
export class AuthService {
  private readonly verificationTtlMinutes = 15;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: CreateUserDto) {
    const safeUser = await this.userService.create({ ...dto, role: 'User' });
    const userId = this.extractUserId(safeUser);
    if (!userId) {
      throw new BadRequestException('Unable to create account');
    }
    const devCode = await this.issueVerificationCode(userId, safeUser.email);
    return {
      message: 'We sent a 6-digit verification code to your email.',
      email: safeUser.email,
      expiresInMinutes: this.verificationTtlMinutes,
      ...(devCode ? { devCode } : {}),
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await this.userService.comparePassword(
      password,
      user.password,
    );

    if (!isValid) {
      return null;
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Please verify your email before signing in.',
      );
    }

    return this.userService.toSafeUser(
      typeof user.toObject === 'function' ? user.toObject() : user,
    );
  }

  login(user: Record<string, unknown>) {
    const plainUser = this.extractPlainUser(user);
    const safeUser = this.userService.toSafeUser(plainUser);
    const rawId =
      (safeUser as { _id?: { toString: () => string } })?._id ??
      (plainUser as { _id?: { toString: () => string } })?._id ??
      (plainUser as { id?: string })?.id;
    const payload = {
      sub: typeof rawId === 'string' ? rawId : (rawId?.toString?.() ?? ''),
      role:
        (safeUser as { role?: string })?.role ??
        (plainUser as { role?: string })?.role ??
        'User',
    };
    const accessToken = this.jwtService.sign(payload);
    const decoded: unknown = this.jwtService.decode(accessToken);
    const expiresAt = this.hasExpiry(decoded)
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    return {
      accessToken,
      user: safeUser,
      expiresAt,
    };
  }

  getSession(userId: string) {
    return this.userService.findById(userId);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isVerified) {
      return { message: 'Email already verified.' };
    }
    if (
      !user.verificationCode ||
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Verification code has expired. Please request a new code.',
      );
    }
    const matches = await this.userService.comparePassword(
      dto.code,
      user.verificationCode,
    );
    if (!matches) {
      throw new BadRequestException('Invalid verification code.');
    }

    const userId = this.extractUserId(user);
    if (!userId) {
      throw new BadRequestException('Unable to verify account.');
    }
    await this.userService.markEmailVerified(userId);
    return { message: 'Email verified successfully.' };
  }

  async resendVerification(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isVerified) {
      return { message: 'Email already verified.' };
    }
    const userId = this.extractUserId(user);
    if (!userId) {
      throw new BadRequestException('Unable to resend code.');
    }
    const devCode = await this.issueVerificationCode(userId, user.email);
    return {
      message: 'We sent a fresh verification code to your email.',
      expiresInMinutes: this.verificationTtlMinutes,
      ...(devCode ? { devCode } : {}),
    };
  }

  private async issueVerificationCode(userId: string, email: string) {
    const code = this.generateVerificationCode();
    const hash = await this.userService.hashPassword(code);
    const expiresAt = new Date(
      Date.now() + this.verificationTtlMinutes * 60 * 1000,
    );
    await this.userService.assignVerificationCode(userId, hash, expiresAt);
    this.mailService.sendVerificationEmail(email, code);
    return process.env.NODE_ENV !== 'production' ? code : undefined;
  }

  private generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private extractUserId(source: Record<string, unknown>) {
    const maybeId =
      (source as { _id?: { toString: () => string } })._id ??
      (source as { id?: string }).id;
    if (!maybeId) {
      return null;
    }
    return typeof maybeId === 'string'
      ? maybeId
      : (maybeId.toString?.() ?? null);
  }

  private extractPlainUser(user: Record<string, unknown>) {
    const maybeDoc = user as { toObject?: () => Record<string, unknown> };
    return typeof maybeDoc.toObject === 'function' ? maybeDoc.toObject() : user;
  }

  private hasExpiry(decoded: unknown): decoded is { exp: number } {
    return (
      decoded !== null &&
      typeof decoded === 'object' &&
      'exp' in decoded &&
      typeof (decoded as { exp?: unknown }).exp === 'number'
    );
  }
}
