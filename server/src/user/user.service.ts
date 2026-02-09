import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AttendanceService } from '../attendance/attendance.service';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @Inject(forwardRef(() => AttendanceService))
    private readonly attendanceService: AttendanceService,
  ) {}

  async findAll() {
    const users = await this.userModel
      .find({ deletedAt: null })
      .lean()
      .exec();
    return users.map((user) => this.toSafeUser(user));
  }

  /** Phase 5.1: Creates User with role User, Teacher, or Admin (single identity collection). */
  async create(createUserDto: CreateUserDto) {
    const role = createUserDto.role ?? 'User';
    const hashedPassword = await this.hashPassword(createUserDto.password);
    const payload: Record<string, unknown> = {
      ...createUserDto,
      password: hashedPassword,
      role,
    };
    if (createUserDto.isVerified === true) {
      payload.isVerified = true;
    }
    if (role === 'Teacher') {
      payload.teacherProfile = {
        teacherStatus: createUserDto.teacherStatus ?? 'pending',
      };
      payload.teacherStatus = createUserDto.teacherStatus ?? 'pending'; // backward compat
    }
    if (role === 'Admin' && createUserDto.branchId && Types.ObjectId.isValid(createUserDto.branchId)) {
      payload.branchId = new Types.ObjectId(createUserDto.branchId);
    }
    const user = await this.userModel.create(payload);
    return this.toSafeUser(user.toObject());
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) {
      updateUserDto.password = await this.hashPassword(updateUserDto.password);
    }

    const updatedUser = await this.userModel
      .findOneAndUpdate({ _id: id, deletedAt: null }, updateUserDto, {
        new: true,
      })
      .lean()
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return this.toSafeUser(updatedUser);
  }

  async remove(id: string) {
    const result = await this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { isActive: false, deletedAt: new Date() },
        { new: true },
      )
      .lean()
      .exec();
    if (!result) {
      throw new NotFoundException('User not found');
    }
    // Also deactivate any attendance participants linked to this user (teachers or students)
    await this.attendanceService.deactivateParticipantsForUser(id);
    return { message: 'User removed' };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email, deletedAt: null }).exec();
  }

  async assignVerificationCode(
    userId: string,
    codeHash: string,
    expiresAt: Date,
  ) {
    await this.userModel
      .findByIdAndUpdate(userId, {
        verificationCode: codeHash,
        verificationCodeExpiresAt: expiresAt,
        isVerified: false,
      })
      .exec();
  }

  async markEmailVerified(userId: string) {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          isVerified: true,
          verificationCode: null,
          verificationCodeExpiresAt: null,
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return this.toSafeUser(updatedUser);
  }

  async assignPasswordResetCode(
    email: string,
    codeHash: string,
    expiresAt: Date,
  ) {
    await this.userModel
      .findOneAndUpdate(
        { email },
        {
          passwordResetCode: codeHash,
          passwordResetCodeExpiresAt: expiresAt,
        },
        { new: false },
      )
      .exec();
  }

  async resetPasswordWithCode(email: string, newPassword: string) {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.password = await this.hashPassword(newPassword);
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpiresAt = undefined;
    await user.save();
    return this.toSafeUser(user.toObject());
  }

  async findById(id: string) {
    const user = await this.userModel
      .findOne({ _id: id, deletedAt: null })
      .populate('branchId', 'name')
      .lean()
      .exec();
    return user ? this.toSafeUser(user) : null;
  }

  /** Return a map of userId -> email for the given ids (for payment reminders etc.). */
  async getEmailsByIds(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    const users = await this.userModel
      .find({ _id: { $in: objectIds }, deletedAt: null })
      .select('_id email')
      .lean()
      .exec();
    const map = new Map<string, string>();
    for (const u of users) {
      const id = (u as { _id: Types.ObjectId })._id.toString();
      const email = (u as { email?: string }).email;
      if (email && String(email).trim()) map.set(id, String(email).trim());
    }
    return map;
  }

  /** List Users with role Teacher (for admin UI). */
  async findTeachers() {
    const teachers = await this.userModel
      .find({ role: 'Teacher', deletedAt: null })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return teachers.map((u) => this.toSafeUser(u));
  }

  /** Phase 5.3: List Users with role Admin, optionally filtered by branchId. Include branch name. */
  async findAdmins(branchFilter?: { branchId?: string }) {
    const filter: Record<string, unknown> = { role: 'Admin', deletedAt: null };
    if (branchFilter?.branchId && Types.ObjectId.isValid(branchFilter.branchId)) {
      filter.branchId = new Types.ObjectId(branchFilter.branchId);
    }
    const admins = await this.userModel
      .find(filter)
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return admins.map((a) => this.toSafeUser(a));
  }

  async setRefreshToken(userId: string, refreshTokenHash: string, expiresAt: Date) {
    await this.userModel.findByIdAndUpdate(userId, {
      refreshTokenHash,
      refreshTokenExpiresAt: expiresAt,
    }).exec();
  }

  async clearRefreshToken(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    }).exec();
  }

  async getRefreshTokenData(userId: string) {
    return this.userModel
      .findById(userId, { refreshTokenHash: 1, refreshTokenExpiresAt: 1 })
      .lean()
      .exec();
  }

  toSafeUser<T extends { password?: string }>(user: T): Omit<T, 'password'>;
  toSafeUser<T extends { password?: string } | null>(
    user: T,
  ): T extends null ? null : Omit<NonNullable<T>, 'password'>;
  toSafeUser(user: { password?: string } | null) {
    if (!user) {
      return null;
    }

    const plain =
      typeof (user as { toObject?: () => Record<string, unknown> }).toObject ===
      'function'
        ? (user as { toObject: () => Record<string, unknown> }).toObject()
        : user;

    const {
      password: _password,
      verificationCode: _verificationCode,
      verificationCodeExpiresAt: _verificationExpires,
      passwordResetCode: _passwordResetCode,
      passwordResetCodeExpiresAt: _passwordResetExpires,
      refreshTokenHash: _refreshTokenHash,
      refreshTokenExpiresAt: _refreshTokenExpiresAt,
      ...rest
    } = plain as Record<string, unknown>;
    void _password;
    void _verificationCode;
    void _verificationExpires;
    void _passwordResetCode;
    void _passwordResetExpires;
    void _refreshTokenHash;
    void _refreshTokenExpiresAt;
    return rest;
  }
}
