import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  StudentAttendanceParticipant,
  StudentAttendanceParticipantDocument,
} from '../attendance/schemas/student-attendance-participant.schema';

const SALT_ROUNDS = 10;

@Injectable()
export class StudentService {
  constructor(
    @InjectModel(StudentAttendanceParticipant.name)
    private readonly studentModel: Model<StudentAttendanceParticipantDocument>,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  findByEmail(email: string) {
    return this.studentModel.findOne({ email }).exec();
  }

  findById(id: string) {
    return this.studentModel.findById(id).lean().exec();
  }

  async assignVerificationCode(
    studentId: string,
    codeHash: string,
    expiresAt: Date,
  ) {
    await this.studentModel
      .findByIdAndUpdate(studentId, {
        verificationCode: codeHash,
        verificationCodeExpiresAt: expiresAt,
        isVerified: false,
      })
      .exec();
  }

  async markEmailVerified(studentId: string) {
    const updatedStudent = await this.studentModel
      .findByIdAndUpdate(
        studentId,
        {
          isVerified: true,
          verificationCode: null,
          verificationCodeExpiresAt: null,
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!updatedStudent) {
      return null;
    }
    return this.toSafeStudent(updatedStudent);
  }

  async assignPasswordResetCode(
    email: string,
    codeHash: string,
    expiresAt: Date,
  ) {
    await this.studentModel
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
    await this.studentModel
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

  async changePassword(studentId: string, currentPassword: string, newPassword: string) {
    const student = await this.studentModel.findById(studentId).exec();
    if (!student || !student.password) {
      throw new Error('Student not found or password not set');
    }
    
    const isValid = await this.comparePassword(currentPassword, student.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const hashedPassword = await this.hashPassword(newPassword);
    await this.studentModel.findByIdAndUpdate(studentId, {
      password: hashedPassword,
      mustChangePassword: false, // Clear the flag after password change
    }).exec();
  }

  toSafeStudent(student: unknown) {
    if (!student || typeof student !== 'object') {
      return null;
    }
    const s = student as Record<string, unknown>;
    const {
      password,
      verificationCode,
      passwordResetCode,
      ...safe
    } = s;
    return safe;
  }
}
