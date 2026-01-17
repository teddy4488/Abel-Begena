import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { TeacherService } from '../teacher/teacher.service';
import { AdminUserService } from '../admin-user/admin-user.service';
import { StudentService } from '../student/student.service';
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

@Injectable()
export class AuthService {
  private readonly verificationTtlMinutes = 15;

  constructor(
    private readonly userService: UserService,
    private readonly teacherService: TeacherService,
    private readonly adminUserService: AdminUserService,
    private readonly studentService: StudentService,
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

  async validateUser(email: string, password: string): Promise<ValidatedUser | null> {
    // Check all user tables in order: WebsiteUser, Teacher, AdminUser, Student
    // Website User
    let user = await this.userService.findByEmail(email);
    if (user) {
      const isValid = await this.userService.comparePassword(
        password,
        user.password,
      );
      if (isValid) {
        if (!user.isVerified) {
          throw new UnauthorizedException(
            'Please verify your email before signing in.',
          );
        }
        const safeUser = this.userService.toSafeUser(
          typeof user.toObject === 'function' ? user.toObject() : user,
        );
        return {
          ...safeUser,
          userType: 'website_user' as UserType,
          role: (safeUser as { role?: string })?.role ?? 'User',
        };
      }
    }

    // Teacher
    let teacher = await this.teacherService.findByEmail(email);
    if (teacher) {
      const isValid = await this.teacherService.comparePassword(
        password,
        teacher.password,
      );
      if (isValid) {
        if (!teacher.isVerified) {
          throw new UnauthorizedException(
            'Please verify your email before signing in.',
          );
        }
        const safeTeacher = this.teacherService.toSafeTeacher(
          typeof teacher.toObject === 'function' ? teacher.toObject() : teacher,
        );
        return {
          ...safeTeacher,
          userType: 'teacher' as UserType,
          role: 'Teacher',
        };
      }
    }

    // Admin User
    let admin = await this.adminUserService.findByEmail(email);
    if (admin) {
      const isValid = await this.adminUserService.comparePassword(
        password,
        admin.password,
      );
      if (isValid) {
        if (!admin.isVerified) {
          throw new UnauthorizedException(
            'Please verify your email before signing in.',
          );
        }
        const safeAdmin = this.adminUserService.toSafeAdmin(
          typeof admin.toObject === 'function' ? admin.toObject() : admin,
        );
        return {
          ...safeAdmin,
          userType: 'admin' as UserType,
          role: 'Admin',
        };
      }
    }

    // Student
    let student = await this.studentService.findByEmail(email);
    if (student) {
      if (!student.password) {
        return null; // Student doesn't have password set yet
      }
      const isValid = await this.studentService.comparePassword(
        password,
        student.password,
      );
      if (isValid) {
        if (!student.isVerified) {
          throw new UnauthorizedException(
            'Please verify your email before signing in.',
          );
        }
        const safeStudent = this.studentService.toSafeStudent(
          typeof student.toObject === 'function' ? student.toObject() : student,
        );
        return {
          ...safeStudent,
          userType: 'student' as UserType,
          role: 'Student',
        };
      }
    }

    return null;
  }

  login(user: Record<string, unknown>) {
    const plainUser = this.extractPlainUser(user);
    const userType = (plainUser as { userType?: UserType })?.userType ?? 'website_user';
    const role = (plainUser as { role?: string })?.role ?? 'User';
    
    // Extract safe user based on type
    let safeUser: Record<string, unknown> | null;
    if (userType === 'teacher') {
      safeUser = this.teacherService.toSafeTeacher(plainUser);
    } else if (userType === 'admin') {
      safeUser = this.adminUserService.toSafeAdmin(plainUser);
    } else if (userType === 'student') {
      safeUser = this.studentService.toSafeStudent(plainUser);
    } else {
      safeUser = this.userService.toSafeUser(plainUser);
    }
    
    if (!safeUser) {
      throw new BadRequestException('Unable to process user data');
    }

    const rawId =
      (safeUser as { _id?: { toString: () => string } })?._id ??
      (plainUser as { _id?: { toString: () => string } })?._id ??
      (plainUser as { id?: string })?.id;
    
    const payload = {
      sub: typeof rawId === 'string' ? rawId : (rawId?.toString?.() ?? ''),
      role,
      userType,
    };
    
    const accessToken = this.jwtService.sign(payload);
    const decoded: unknown = this.jwtService.decode(accessToken);
    const expiresAt = this.hasExpiry(decoded)
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    
    return {
      accessToken,
      user: { ...safeUser, userType, role },
      expiresAt,
    };
  }

  async getSession(userId: string, userType?: UserType) {
    // Try to find user in the appropriate table based on userType
    if (userType === 'teacher') {
      const teacher = await this.teacherService.findById(userId);
      if (teacher) {
        return {
          ...this.teacherService.toSafeTeacher(teacher),
          userType: 'teacher' as UserType,
          role: 'Teacher',
        };
      }
    } else if (userType === 'admin') {
      const admin = await this.adminUserService.findById(userId);
      if (admin) {
        return {
          ...this.adminUserService.toSafeAdmin(admin),
          userType: 'admin' as UserType,
          role: 'Admin',
        };
      }
    } else if (userType === 'student') {
      const student = await this.studentService.findById(userId);
      if (student) {
        return {
          ...this.studentService.toSafeStudent(student),
          userType: 'student' as UserType,
          role: 'Student',
        };
      }
    }
    
    // Default to website user
    const user = await this.userService.findById(userId);
    if (user) {
      return {
        ...user,
        userType: 'website_user' as UserType,
        role: (user as { role?: string })?.role ?? 'User',
      };
    }
    
    return null;
  }

  async verifyEmail(dto: VerifyEmailDto) {
    // Check all user tables
    let user: any = await this.userService.findByEmail(dto.email);
    let userType: UserType = 'website_user';
    
    if (!user) {
      user = await this.teacherService.findByEmail(dto.email);
      userType = 'teacher';
    }
    
    if (!user) {
      user = await this.adminUserService.findByEmail(dto.email);
      userType = 'admin';
    }
    
    if (!user) {
      user = await this.studentService.findByEmail(dto.email);
      userType = 'student';
    }
    
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
    
    let matches = false;
    if (userType === 'teacher') {
      matches = await this.teacherService.comparePassword(
        dto.code,
        user.verificationCode,
      );
    } else if (userType === 'admin') {
      matches = await this.adminUserService.comparePassword(
        dto.code,
        user.verificationCode,
      );
    } else if (userType === 'student') {
      matches = await this.studentService.comparePassword(
        dto.code,
        user.verificationCode,
      );
    } else {
      matches = await this.userService.comparePassword(
        dto.code,
        user.verificationCode,
      );
    }
    
    if (!matches) {
      throw new BadRequestException('Invalid verification code.');
    }

    const userId = this.extractUserId(user);
    if (!userId) {
      throw new BadRequestException('Unable to verify account.');
    }
    
    if (userType === 'teacher') {
      await this.teacherService.markEmailVerified(userId);
    } else if (userType === 'admin') {
      await this.adminUserService.markEmailVerified(userId);
    } else if (userType === 'student') {
      await this.studentService.markEmailVerified(userId);
    } else {
      await this.userService.markEmailVerified(userId);
    }
    
    return { message: 'Email verified successfully.' };
  }

  async resendVerification(email: string) {
    // Check all user tables
    let user: any = await this.userService.findByEmail(email);
    let userType: UserType = 'website_user';
    
    if (!user) {
      user = await this.teacherService.findByEmail(email);
      userType = 'teacher';
    }
    
    if (!user) {
      user = await this.adminUserService.findByEmail(email);
      userType = 'admin';
    }
    
    if (!user) {
      user = await this.studentService.findByEmail(email);
      userType = 'student';
    }
    
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
    
    const devCode = await this.issueVerificationCode(
      userId,
      user.email,
      userType,
    );
    
    return {
      message: 'We sent a fresh verification code to your email.',
      expiresInMinutes: this.verificationTtlMinutes,
      ...(devCode ? { devCode } : {}),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // Check all user tables
    let user: any = await this.userService.findByEmail(dto.email);
    let userType: UserType = 'website_user';
    
    if (!user) {
      user = await this.teacherService.findByEmail(dto.email);
      userType = 'teacher';
    }
    
    if (!user) {
      user = await this.adminUserService.findByEmail(dto.email);
      userType = 'admin';
    }
    
    if (!user) {
      user = await this.studentService.findByEmail(dto.email);
      userType = 'student';
    }
    
    if (!user) {
      return {
        message: 'If that email exists, a reset code has been sent.',
      };
    }
    
    const devCode = await this.issuePasswordResetCode(dto.email, userType);
    return {
      message: 'If that email exists, a reset code has been sent.',
      ...(devCode ? { devCode } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // Check all user tables
    let user: any = await this.userService.findByEmail(dto.email);
    let userType: UserType = 'website_user';
    
    if (!user) {
      user = await this.teacherService.findByEmail(dto.email);
      userType = 'teacher';
    }
    
    if (!user) {
      user = await this.adminUserService.findByEmail(dto.email);
      userType = 'admin';
    }
    
    if (!user) {
      user = await this.studentService.findByEmail(dto.email);
      userType = 'student';
    }
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (
      !user.passwordResetCode ||
      !user.passwordResetCodeExpiresAt ||
      user.passwordResetCodeExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Reset code has expired. Please request a new code.',
      );
    }
    
    let matches = false;
    if (userType === 'teacher') {
      matches = await this.teacherService.comparePassword(
        dto.code,
        user.passwordResetCode,
      );
    } else if (userType === 'admin') {
      matches = await this.adminUserService.comparePassword(
        dto.code,
        user.passwordResetCode,
      );
    } else if (userType === 'student') {
      matches = await this.studentService.comparePassword(
        dto.code,
        user.passwordResetCode,
      );
    } else {
      matches = await this.userService.comparePassword(
        dto.code,
        user.passwordResetCode,
      );
    }
    
    if (!matches) {
      throw new BadRequestException('Invalid reset code.');
    }
    
    if (userType === 'teacher') {
      await this.teacherService.resetPasswordWithCode(dto.email, dto.password);
    } else if (userType === 'admin') {
      await this.adminUserService.resetPasswordWithCode(dto.email, dto.password);
    } else if (userType === 'student') {
      await this.studentService.resetPasswordWithCode(dto.email, dto.password);
    } else {
      await this.userService.resetPasswordWithCode(dto.email, dto.password);
    }
    
    return { message: 'Password updated successfully.' };
  }

  async changePassword(userId: string, userType: UserType | undefined, dto: { currentPassword: string; newPassword: string }) {
    // Only students need password change on first login
    // But this endpoint can be used by any user type
    if (userType === 'student') {
      await this.studentService.changePassword(userId, dto.currentPassword, dto.newPassword);
    } else if (userType === 'teacher') {
      const teacher = await this.teacherService.findById(userId);
      if (!teacher || !teacher.password) {
        throw new BadRequestException('Teacher not found or password not set');
      }
      const isValid = await this.teacherService.comparePassword(dto.currentPassword, teacher.password);
      if (!isValid) {
        throw new BadRequestException('Current password is incorrect');
      }
      // update() method will hash the password automatically
      await this.teacherService.update(userId, { password: dto.newPassword } as any);
    } else if (userType === 'admin') {
      const admin = await this.adminUserService.findById(userId);
      if (!admin || !admin.password) {
        throw new BadRequestException('Admin not found or password not set');
      }
      const isValid = await this.adminUserService.comparePassword(dto.currentPassword, admin.password);
      if (!isValid) {
        throw new BadRequestException('Current password is incorrect');
      }
      // update() method will hash the password automatically
      await this.adminUserService.update(userId, { password: dto.newPassword });
    } else {
      // website_user - need to get user with password, so use findByEmail
      // First get the user email from the safe user object
      const safeUser = await this.userService.findById(userId);
      if (!safeUser || !('email' in safeUser)) {
        throw new BadRequestException('User not found');
      }
      // Now get the full user document (with password) using findByEmail
      const userDoc = await this.userService.findByEmail((safeUser as { email: string }).email);
      if (!userDoc) {
        throw new BadRequestException('User not found');
      }
      // UserDocument has password property
      const userPassword = (userDoc as { password?: string }).password;
      if (!userPassword) {
        throw new BadRequestException('Password not set');
      }
      const isValid = await this.userService.comparePassword(dto.currentPassword, userPassword);
      if (!isValid) {
        throw new BadRequestException('Current password is incorrect');
      }
      // update() method will hash the password automatically
      await this.userService.update(userId, { password: dto.newPassword } as any);
    }
    return { message: 'Password changed successfully.' };
  }

  private async issueVerificationCode(
    userId: string,
    email: string,
    userType: UserType = 'website_user',
  ) {
    const code = this.generateVerificationCode();
    let hash: string;
    let expiresAt: Date;
    
    if (userType === 'teacher') {
      hash = await this.teacherService.hashPassword(code);
      expiresAt = new Date(
        Date.now() + this.verificationTtlMinutes * 60 * 1000,
      );
      await this.teacherService.assignVerificationCode(userId, hash, expiresAt);
    } else if (userType === 'admin') {
      hash = await this.adminUserService.hashPassword(code);
      expiresAt = new Date(
        Date.now() + this.verificationTtlMinutes * 60 * 1000,
      );
      await this.adminUserService.assignVerificationCode(userId, hash, expiresAt);
    } else if (userType === 'student') {
      hash = await this.studentService.hashPassword(code);
      expiresAt = new Date(
        Date.now() + this.verificationTtlMinutes * 60 * 1000,
      );
      await this.studentService.assignVerificationCode(userId, hash, expiresAt);
    } else {
      hash = await this.userService.hashPassword(code);
      expiresAt = new Date(
        Date.now() + this.verificationTtlMinutes * 60 * 1000,
      );
      await this.userService.assignVerificationCode(userId, hash, expiresAt);
    }
    
    await this.mailService.sendVerificationEmail(email, code);
    return process.env.NODE_ENV !== 'production' ? code : undefined;
  }

  private generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async issuePasswordResetCode(
    email: string,
    userType: UserType = 'website_user',
  ) {
    const code = this.generateVerificationCode();
    let hash: string;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    if (userType === 'teacher') {
      hash = await this.teacherService.hashPassword(code);
      await this.teacherService.assignPasswordResetCode(email, hash, expiresAt);
    } else if (userType === 'admin') {
      hash = await this.adminUserService.hashPassword(code);
      await this.adminUserService.assignPasswordResetCode(email, hash, expiresAt);
    } else if (userType === 'student') {
      hash = await this.studentService.hashPassword(code);
      await this.studentService.assignPasswordResetCode(email, hash, expiresAt);
    } else {
      hash = await this.userService.hashPassword(code);
      await this.userService.assignPasswordResetCode(email, hash, expiresAt);
    }
    
    await this.mailService.sendPasswordResetEmail(email, code);
    return process.env.NODE_ENV !== 'production' ? code : undefined;
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
