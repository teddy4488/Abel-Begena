import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AdminUser, AdminUserDocument } from './schemas/admin-user.schema';

const SALT_ROUNDS = 10;

@Injectable()
export class AdminUserService {
  constructor(
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
  ) {}

  async findAll() {
    const admins = await this.adminUserModel
      .find({ deletedAt: null })
      .lean()
      .exec();
    return admins.map((admin) => this.toSafeAdmin(admin));
  }

  async create(createAdminDto: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    isActive?: boolean;
    isVerified?: boolean;
  }) {
    const hashedPassword = await this.hashPassword(createAdminDto.password);
    const admin = await this.adminUserModel.create({
      ...createAdminDto,
      password: hashedPassword,
      isActive: createAdminDto.isActive ?? true,
      isVerified: createAdminDto.isVerified ?? false,
    });
    return this.toSafeAdmin(admin.toObject());
  }

  async update(id: string, updateAdminDto: Partial<AdminUser>) {
    if (updateAdminDto.password) {
      updateAdminDto.password = await this.hashPassword(
        updateAdminDto.password as string,
      );
    }

    const updatedAdmin = await this.adminUserModel
      .findOneAndUpdate({ _id: id, deletedAt: null }, updateAdminDto, {
        new: true,
      })
      .lean()
      .exec();

    if (!updatedAdmin) {
      throw new NotFoundException('Admin not found');
    }

    return this.toSafeAdmin(updatedAdmin);
  }

  async remove(id: string) {
    const result = await this.adminUserModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { isActive: false, deletedAt: new Date() },
        { new: true },
      )
      .lean()
      .exec();
    if (!result) {
      throw new NotFoundException('Admin not found');
    }
    return { message: 'Admin removed' };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  findByEmail(email: string) {
    return this.adminUserModel.findOne({ email, deletedAt: null }).exec();
  }

  findById(id: string) {
    return this.adminUserModel.findOne({ _id: id, deletedAt: null }).lean().exec();
  }

  async setRefreshToken(adminId: string, refreshTokenHash: string, expiresAt: Date) {
    await this.adminUserModel.findByIdAndUpdate(adminId, {
      refreshTokenHash,
      refreshTokenExpiresAt: expiresAt,
    }).exec();
  }

  async clearRefreshToken(adminId: string) {
    await this.adminUserModel.findByIdAndUpdate(adminId, {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    }).exec();
  }

  async getRefreshTokenData(adminId: string) {
    return this.adminUserModel
      .findById(adminId, { refreshTokenHash: 1, refreshTokenExpiresAt: 1 })
      .lean()
      .exec();
  }

  async assignVerificationCode(
    adminId: string,
    codeHash: string,
    expiresAt: Date,
  ) {
    await this.adminUserModel
      .findByIdAndUpdate(adminId, {
        verificationCode: codeHash,
        verificationCodeExpiresAt: expiresAt,
        isVerified: false,
      })
      .exec();
  }

  async markEmailVerified(adminId: string) {
    const updatedAdmin = await this.adminUserModel
      .findByIdAndUpdate(
        adminId,
        {
          isVerified: true,
          verificationCode: null,
          verificationCodeExpiresAt: null,
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!updatedAdmin) {
      throw new NotFoundException('Admin not found');
    }
    return this.toSafeAdmin(updatedAdmin);
  }

  async assignPasswordResetCode(email: string, codeHash: string, expiresAt: Date) {
    await this.adminUserModel
      .findOneAndUpdate(
        { email },
        {
          passwordResetCode: codeHash,
          passwordResetCodeExpiresAt: expiresAt,
        },
      )
      .exec();
  }

  async resetPasswordWithCode(email: string, newPassword: string) {
    const hashedPassword = await this.hashPassword(newPassword);
    await this.adminUserModel
      .findOneAndUpdate(
        { email },
        {
          password: hashedPassword,
          passwordResetCode: null,
          passwordResetCodeExpiresAt: null,
        },
      )
      .exec();
  }

  toSafeAdmin(admin: unknown) {
    if (!admin || typeof admin !== 'object') {
      return null;
    }
    const a = admin as Record<string, unknown>;
    const {
      password,
      verificationCode,
      passwordResetCode,
      refreshTokenHash,
      refreshTokenExpiresAt,
      ...safe
    } = a;
    void refreshTokenHash;
    void refreshTokenExpiresAt;
    return safe;
  }
}
