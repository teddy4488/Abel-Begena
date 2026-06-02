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
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export type UserType = 'website_user' | 'teacher' | 'admin' | 'student';

export type ValidatedUser = Record<string, unknown> & {
  userType: UserType;
  role: string;
};

/** Derive JWT userType from User.role (Phase 5.1: single User collection). */
function roleToUserType(role: string): UserType {
  switch (role) {
    case 'Teacher':
      return 'teacher';
    case 'Admin':
    case 'SuperAdmin':
      return 'admin';
    case 'Student':
      return 'student';
    default:
      return 'website_user';
  }
}

@Injectable()
export class AuthService {
  private readonly verificationTtlMinutes = 15;
  private readonly refreshTtlDays = 30;
  private readonly resendCooldownMs = 60 * 1000;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: CreateUserDto) {
    // Registration always creates a website user
    const safeUser = await this.userService.create({ ...dto, role: 'User' });
    if (!safeUser) {
      throw new BadRequestException('Unable to create account');
    }
    const userId = this.extractUserId(safeUser);
    if (!userId) {
      throw new BadRequestException('Unable to create account');
    }
    const devCode = await this.issueVerificationCode(
      userId,
      safeUser.email,
      'website_user',
    );
    return {
      message: 'We sent a 6-digit verification code to your email.',
      email: safeUser.email,
      expiresInMinutes: this.verificationTtlMinutes,
      ...(devCode ? { devCode } : {}),
    };
  }

  /** Phase 5.1: validate only User collection; userType derived from user.role. */
  async validateUser(email: string, password: string): Promise<ValidatedUser | null> {
    const user = await this.userService.findByEmail(email);
    if (!user) return null;
    const userObj = typeof (user as { toObject?: () => unknown }).toObject === 'function'
      ? (user as { toObject: () => unknown }).toObject()
      : user;
    const passwordHash = (userObj as { password?: string }).password;
    if (!passwordHash) return null; // e.g. Student without password set yet
    const isValid = await this.userService.comparePassword(password, passwordHash);
    if (!isValid) return null;
    if (!(userObj as { isActive?: boolean }).isActive) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact support.');
    }
    if (!(userObj as { isVerified?: boolean }).isVerified) {
      throw new UnauthorizedException(
        'Please verify your email before signing in.',
      );
    }
    const safeUser = this.userService.toSafeUser(userObj as { password?: string });
    const role = (safeUser as { role?: string })?.role ?? 'User';
    return {
      ...safeUser,
      userType: roleToUserType(role),
      role,
    };
  }

  /** Phase 5.1: all identities are User; safe shape from UserService. */
  login(user: Record<string, unknown>) {
    const plainUser = this.extractPlainUser(user);
    const userType = (plainUser as { userType?: UserType })?.userType ?? 'website_user';
    const role = (plainUser as { role?: string })?.role ?? 'User';
    const safeUser = this.userService.toSafeUser(plainUser as { password?: string });
    if (!safeUser) {
      throw new BadRequestException('Unable to process user data');
    }
    const rawId =
      (safeUser as { _id?: { toString: () => string } })?._id ??
      (plainUser as { _id?: { toString: () => string } })?._id ??
      (plainUser as { id?: string })?.id;
    const branchIdRaw = (safeUser as { branchId?: { toString: () => string } })?.branchId;
    const branchId = branchIdRaw ? (typeof branchIdRaw === 'string' ? branchIdRaw : branchIdRaw?.toString?.()) : undefined;
    const payload = {
      sub: typeof rawId === 'string' ? rawId : (rawId?.toString?.() ?? ''),
      role,
      userType,
      ...(branchId && { branchId }),
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(
      { ...payload, typ: 'refresh' as const },
      { expiresIn: `${this.refreshTtlDays}d` },
    );
    const decoded: unknown = this.jwtService.decode(accessToken);
    const expiresAt = this.hasExpiry(decoded)
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    return {
      accessToken,
      refreshToken,
      userId: payload.sub,
      user: { ...safeUser, userType, role },
      expiresAt,
    };
  }

  /** Phase 5.1: userId is always User id. */
  async persistRefreshToken(userId: string, _userType: UserType, refreshToken: string) {
    const decoded: unknown = this.jwtService.decode(refreshToken);
    const expiresAt = this.hasExpiry(decoded)
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
    const hash = await this.userService.hashPassword(refreshToken);
    await this.userService.setRefreshToken(userId, hash, expiresAt);
    return expiresAt;
  }

  async clearRefreshToken(userId: string, _userType: UserType) {
    await this.userService.clearRefreshToken(userId);
  }

  /** Phase 5.1: refresh always loads from User by payload.sub. */
  async refreshSession(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: string; user: unknown }> {
    let payload: { sub?: string; role?: string; userType?: UserType; typ?: string };
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (!payload || payload.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const userId: string = payload.sub!;
    const userType: UserType = payload.userType ?? 'website_user';
    const tokenData = await this.userService.getRefreshTokenData(userId);
    const storedHash = (tokenData as { refreshTokenHash?: string } | null)?.refreshTokenHash;
    const storedExpiresAt = (tokenData as { refreshTokenExpiresAt?: Date } | null)?.refreshTokenExpiresAt;
    if (!storedHash) {
      throw new UnauthorizedException('Refresh session not found');
    }
    if (storedExpiresAt && new Date(storedExpiresAt).getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh session expired');
    }
    const compare = await this.userService.comparePassword(refreshToken, storedHash);
    if (!compare) {
      throw new UnauthorizedException('Refresh token does not match');
    }
    const currentUser = await this.userService.findById(userId);
    if (!currentUser || !(currentUser as { isActive?: boolean }).isActive) {
      throw new UnauthorizedException('Account deactivated or not found');
    }
    // Use live role from DB so role changes take effect on next refresh
    const liveRole = (currentUser as { role?: string })?.role ?? payload.role ?? 'User';
    const liveUserType = roleToUserType(liveRole);
    const branchIdRaw = (currentUser as { branchId?: { toString: () => string } } | null)?.branchId;
    const branchId = branchIdRaw ? (typeof branchIdRaw === 'string' ? branchIdRaw : branchIdRaw?.toString?.()) : undefined;
    const accessPayload = {
      sub: userId,
      role: liveRole,
      userType: liveUserType,
      ...(branchId && { branchId }),
    };
    const newAccessToken = this.jwtService.sign(accessPayload, { expiresIn: '15m' });
    const newRefreshToken = this.jwtService.sign(
      { ...accessPayload, typ: 'refresh' as const },
      { expiresIn: `${this.refreshTtlDays}d` },
    );
    const decoded: unknown = this.jwtService.decode(newAccessToken);
    const expiresAt = this.hasExpiry(decoded)
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await this.persistRefreshToken(userId, liveUserType, newRefreshToken);
    const user = await this.getSession(userId, userType);
    return { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresAt, user };
  }

  /** Phase 5.1: single User collection; userType derived from user.role. */
  async getSession(userId: string, userType?: UserType): Promise<unknown> {
    const user = await this.userService.findById(userId);
    if (!user) return null;
    const role = (user as { role?: string })?.role ?? 'User';
    return {
      ...user,
      userType: userType ?? roleToUserType(role),
      role,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new NotFoundException('User not found');
    const userObj = typeof (user as { toObject?: () => unknown }).toObject === 'function'
      ? (user as { toObject: () => unknown }).toObject()
      : user;
    if ((userObj as { isVerified?: boolean }).isVerified) {
      return { message: 'Email already verified.' };
    }
    const verificationCode = (userObj as { verificationCode?: string }).verificationCode;
    const verificationCodeExpiresAt = (userObj as { verificationCodeExpiresAt?: Date }).verificationCodeExpiresAt;
    if (!verificationCode || !verificationCodeExpiresAt || new Date(verificationCodeExpiresAt).getTime() < Date.now()) {
      throw new BadRequestException(
        'Verification code has expired. Please request a new code.',
      );
    }
    const matches = await this.userService.comparePassword(dto.code, verificationCode);
    if (!matches) throw new BadRequestException('Invalid verification code.');
    const userId = this.extractUserId(userObj);
    if (!userId) throw new BadRequestException('Unable to verify account.');
    await this.userService.markEmailVerified(userId);
    return { message: 'Email verified successfully.' };
  }

  async resendVerification(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    const userObj = typeof (user as { toObject?: () => unknown }).toObject === 'function'
      ? (user as { toObject: () => unknown }).toObject()
      : user;
    if ((userObj as { isVerified?: boolean }).isVerified) {
      return { message: 'Email already verified.' };
    }
    const verificationCodeExpiresAt = (userObj as { verificationCodeExpiresAt?: Date }).verificationCodeExpiresAt;
    if (verificationCodeExpiresAt) {
      const issuedAt = new Date(
        new Date(verificationCodeExpiresAt).getTime() - this.verificationTtlMinutes * 60 * 1000,
      );
      if (Date.now() - issuedAt.getTime() < this.resendCooldownMs) {
        throw new BadRequestException(
          'Please wait a moment before requesting another verification code.',
        );
      }
    }
    const userId = this.extractUserId(userObj);
    if (!userId) throw new BadRequestException('Unable to resend code.');
    const role = (userObj as { role?: string }).role ?? 'User';
    const devCode = await this.issueVerificationCode(userId, (userObj as { email: string }).email, roleToUserType(role));
    
    return {
      message: 'We sent a fresh verification code to your email.',
      expiresInMinutes: this.verificationTtlMinutes,
      ...(devCode ? { devCode } : {}),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      return { message: 'If that email exists, a reset code has been sent.' };
    }
    const userObj = typeof (user as { toObject?: () => unknown }).toObject === 'function'
      ? (user as { toObject: () => unknown }).toObject()
      : user;
    const passwordResetCodeExpiresAt = (userObj as { passwordResetCodeExpiresAt?: Date }).passwordResetCodeExpiresAt;
    if (passwordResetCodeExpiresAt) {
      const issuedAt = new Date(new Date(passwordResetCodeExpiresAt).getTime() - 10 * 60 * 1000);
      if (Date.now() - issuedAt.getTime() < this.resendCooldownMs) {
        return { message: 'If that email exists, a reset code has been sent.' };
      }
    }
    const role = (userObj as { role?: string }).role ?? 'User';
    const devCode = await this.issuePasswordResetCode(dto.email, roleToUserType(role));
    return {
      message: 'If that email exists, a reset code has been sent.',
      ...(devCode ? { devCode } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new NotFoundException('User not found');
    const userObj = typeof (user as { toObject?: () => unknown }).toObject === 'function'
      ? (user as { toObject: () => unknown }).toObject()
      : user;
    const passwordResetCode = (userObj as { passwordResetCode?: string }).passwordResetCode;
    const passwordResetCodeExpiresAt = (userObj as { passwordResetCodeExpiresAt?: Date }).passwordResetCodeExpiresAt;
    if (!passwordResetCode || !passwordResetCodeExpiresAt || new Date(passwordResetCodeExpiresAt).getTime() < Date.now()) {
      throw new BadRequestException('Reset code has expired. Please request a new code.');
    }
    const matches = await this.userService.comparePassword(dto.code, passwordResetCode);
    if (!matches) throw new BadRequestException('Invalid reset code.');
    await this.userService.resetPasswordWithCode(dto.email, dto.password);
    return { message: 'Password updated successfully.' };
  }

  /** Phase 5.1: userId is always User id. */
  async changePassword(userId: string, _userType: UserType | undefined, dto: { currentPassword: string; newPassword: string }) {
    const safeUser = await this.userService.findById(userId);
    if (!safeUser || !('email' in safeUser)) {
      throw new BadRequestException('User not found');
    }
    const userDoc = await this.userService.findByEmail((safeUser as { email: string }).email);
    if (!userDoc) {
      throw new BadRequestException('User not found');
    }
    const userPassword = (userDoc as { password?: string }).password;
    if (!userPassword) {
      throw new BadRequestException('Password not set');
    }
    const isValid = await this.userService.comparePassword(dto.currentPassword, userPassword);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }
    await this.userService.update(userId, { password: dto.newPassword } as import('../user/dto/update-user.dto').UpdateUserDto);
    // Invalidate all active sessions after password change
    await this.clearRefreshToken(userId, 'website_user');
    return { message: 'Password changed successfully.' };
  }

  private async issueVerificationCode(
    userId: string,
    email: string,
    _userType: UserType = 'website_user',
  ) {
    const code = this.generateVerificationCode();
    const hash = await this.userService.hashPassword(code);
    const expiresAt = new Date(Date.now() + this.verificationTtlMinutes * 60 * 1000);
    await this.userService.assignVerificationCode(userId, hash, expiresAt);
    await this.mailService.sendVerificationEmail(email, code);
    return process.env.EXPOSE_DEV_CODES === 'true' ? code : undefined;
  }

  private generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async issuePasswordResetCode(
    email: string,
    _userType: UserType = 'website_user',
  ) {
    const code = this.generateVerificationCode();
    const hash = await this.userService.hashPassword(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.userService.assignPasswordResetCode(email, hash, expiresAt);
    await this.mailService.sendPasswordResetEmail(email, code);
    return process.env.EXPOSE_DEV_CODES === 'true' ? code : undefined;
  }

  private extractUserId(source: unknown) {
    if (!source || typeof source !== 'object') {
      return null;
    }
    const maybeWithObjectId = source as {
      _id?: { toString: () => string } | string;
      id?: string;
    };
    const maybeId = maybeWithObjectId._id ?? maybeWithObjectId.id;
    if (!maybeId) {
      return null;
    }
    return typeof maybeId === 'string'
      ? maybeId
      : (maybeId.toString?.() ?? null);
  }

  private extractPlainUser(user: unknown) {
    if (!user || typeof user !== 'object') {
      return {};
    }
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
