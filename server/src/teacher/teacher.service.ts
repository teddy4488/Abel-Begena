import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Teacher, TeacherDocument } from './schemas/teacher.schema';

const SALT_ROUNDS = 10;

@Injectable()
export class TeacherService {
  constructor(
    @InjectModel(Teacher.name)
    private readonly teacherModel: Model<TeacherDocument>,
  ) {}

  async findAll() {
    const teachers = await this.teacherModel.find().lean().exec();
    return teachers.map((teacher) => this.toSafeTeacher(teacher));
  }

  async create(createTeacherDto: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    teacherStatus?: 'pending' | 'approved' | 'suspended';
    isActive?: boolean;
    isVerified?: boolean;
  }) {
    const hashedPassword = await this.hashPassword(createTeacherDto.password);
    const teacher = await this.teacherModel.create({
      ...createTeacherDto,
      password: hashedPassword,
      teacherStatus: createTeacherDto.teacherStatus ?? 'pending',
      isActive: createTeacherDto.isActive ?? true,
      isVerified: createTeacherDto.isVerified ?? false,
    });
    return this.toSafeTeacher(teacher.toObject());
  }

  async update(id: string, updateTeacherDto: Partial<Teacher>) {
    if (updateTeacherDto.password) {
      updateTeacherDto.password = await this.hashPassword(
        updateTeacherDto.password as string,
      );
    }

    const updatedTeacher = await this.teacherModel
      .findByIdAndUpdate(id, updateTeacherDto, { new: true })
      .lean()
      .exec();

    if (!updatedTeacher) {
      throw new NotFoundException('Teacher not found');
    }

    return this.toSafeTeacher(updatedTeacher);
  }

  async remove(id: string) {
    const result = await this.teacherModel.findByIdAndDelete(id).lean().exec();
    if (!result) {
      throw new NotFoundException('Teacher not found');
    }
    return { message: 'Teacher removed' };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  findByEmail(email: string) {
    return this.teacherModel.findOne({ email }).exec();
  }

  findById(id: string) {
    return this.teacherModel.findById(id).lean().exec();
  }

  async assignVerificationCode(
    teacherId: string,
    codeHash: string,
    expiresAt: Date,
  ) {
    await this.teacherModel
      .findByIdAndUpdate(teacherId, {
        verificationCode: codeHash,
        verificationCodeExpiresAt: expiresAt,
        isVerified: false,
      })
      .exec();
  }

  async markEmailVerified(teacherId: string) {
    const updatedTeacher = await this.teacherModel
      .findByIdAndUpdate(
        teacherId,
        {
          isVerified: true,
          verificationCode: null,
          verificationCodeExpiresAt: null,
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!updatedTeacher) {
      throw new NotFoundException('Teacher not found');
    }
    return this.toSafeTeacher(updatedTeacher);
  }

  async assignPasswordResetCode(email: string, codeHash: string, expiresAt: Date) {
    await this.teacherModel
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
    await this.teacherModel
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

  toSafeTeacher(teacher: unknown) {
    if (!teacher || typeof teacher !== 'object') {
      return null;
    }
    const t = teacher as Record<string, unknown>;
    const { password, verificationCode, passwordResetCode, ...safe } = t;
    return safe;
  }
}
