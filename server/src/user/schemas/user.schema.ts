import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export type UserRole = 'User' | 'Teacher' | 'Admin' | 'Student' | 'SuperAdmin';

@Schema({ _id: false })
export class TeacherProfile {
  @Prop({ enum: ['pending', 'approved', 'suspended'], default: 'pending' })
  teacherStatus?: 'pending' | 'approved' | 'suspended';
}
export const TeacherProfileSchema = SchemaFactory.createForClass(TeacherProfile);

@Schema({ _id: false })
export class StudentProfile {
  @Prop({ required: true, trim: true, maxlength: 20 })
  attendanceNumber: string;
  @Prop({ required: true, trim: true, maxlength: 120 })
  fullName: string;
  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;
  @Prop({ type: String, enum: ['physical', 'online'] })
  learningType?: 'physical' | 'online';
  @Prop({ type: String })
  instrumentType?: string;
  @Prop({ enum: [3, 6, 9] })
  programDurationMonths?: 3 | 6 | 9;
  @Prop({ type: [String], enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] })
  preferredLearningDays?: string[];
  @Prop({ type: Date })
  registrationStartDate?: Date;
  @Prop({ type: Number })
  learningDaysPerWeek?: number;
  @Prop({ default: true })
  isActive: boolean;
  @Prop({ type: Number, min: 0, default: 0 })
  missedLessonsCount?: number;
}
export const StudentProfileSchema = SchemaFactory.createForClass(StudentProfile);

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ trim: true })
  firstName?: string;

  @Prop({ trim: true })
  lastName?: string;

  @Prop({ unique: true, sparse: true, trim: true })
  phone?: string;

  @Prop({
    required: true,
    enum: ['User', 'Teacher', 'Admin', 'Student', 'SuperAdmin'],
    default: 'User',
    index: true,
  })
  role: UserRole;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ type: Date, required: false, default: null })
  deletedAt?: Date | null;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ type: String, required: false, default: null })
  verificationCode?: string;

  @Prop({ type: Date, required: false, default: null })
  verificationCodeExpiresAt?: Date;

  /** @deprecated Use teacherProfile.teacherStatus (Phase 5.1 consolidation) */
  @Prop({ enum: ['pending', 'approved', 'suspended'] })
  teacherStatus?: 'pending' | 'approved' | 'suspended';

  @Prop({ type: TeacherProfileSchema })
  teacherProfile?: TeacherProfile;

  @Prop({ type: StudentProfileSchema })
  studentProfile?: StudentProfile;

  /** Branch-scoped Admin (Phase 5.3). SuperAdmin has no branchId. */
  @Prop({ type: Types.ObjectId, ref: 'Branch', index: true })
  branchId?: Types.ObjectId;

  @Prop()
  avatarUrl?: string;

  @Prop({ trim: true })
  bio?: string;

  @Prop({ enum: ['en', 'am'], default: 'en' })
  languagePreference?: 'en' | 'am';

  @Prop({ type: String, required: false, default: null })
  passwordResetCode?: string;

  @Prop({ type: Date, required: false, default: null })
  passwordResetCodeExpiresAt?: Date;

  // Refresh-token session (rotated). Stored as a bcrypt hash.
  @Prop({ type: String, required: false, default: null })
  refreshTokenHash?: string | null;

  @Prop({ type: Date, required: false, default: null })
  refreshTokenExpiresAt?: Date | null;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
