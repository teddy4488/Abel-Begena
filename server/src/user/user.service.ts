import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findAll() {
    const users = await this.userModel.find().lean().exec();
    return users.map((user) => this.toSafeUser(user));
  }

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await this.hashPassword(createUserDto.password);
    const user = await this.userModel.create({
      ...createUserDto,
      password: hashedPassword,
      role: createUserDto.role ?? 'User',
      teacherStatus:
        createUserDto.teacherStatus ??
        (createUserDto.role === 'Teacher' ? 'pending' : undefined),
    });
    return this.toSafeUser(user.toObject());
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) {
      updateUserDto.password = await this.hashPassword(updateUserDto.password);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .lean()
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return this.toSafeUser(updatedUser);
  }

  async remove(id: string) {
    const result = await this.userModel.findByIdAndDelete(id).lean().exec();
    if (!result) {
      throw new NotFoundException('User not found');
    }
    return { message: 'User removed' };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
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
    const user = await this.userModel.findById(id).lean().exec();
    return user ? this.toSafeUser(user) : null;
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
      ...rest
    } = plain as Record<string, unknown>;
    void _password;
    void _verificationCode;
    void _verificationExpires;
    void _passwordResetCode;
    void _passwordResetExpires;
    return rest;
  }
}
