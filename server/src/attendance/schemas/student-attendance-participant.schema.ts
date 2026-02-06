import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InstrumentType } from '../../product/schemas/product.schema';

export type StudentAttendanceParticipantDocument =
  StudentAttendanceParticipant & Document;

export type ProgramDuration = 3 | 6 | 9;
export type LearningType = 'physical' | 'online';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

@Schema({ timestamps: true })
export class StudentAttendanceParticipant {
  // Authentication fields (optional - for students who want to access portal)
  @Prop({
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email?: string;

  @Prop()
  password?: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ type: String, required: false, default: null })
  verificationCode?: string;

  @Prop({ type: Date, required: false, default: null })
  verificationCodeExpiresAt?: Date;

  @Prop({ type: String, required: false, default: null })
  passwordResetCode?: string;

  @Prop({ type: Date, required: false, default: null })
  passwordResetCodeExpiresAt?: Date;

  // Refresh-token session (rotated). Stored as a bcrypt hash.
  @Prop({ type: String, required: false, default: null })
  refreshTokenHash?: string | null;

  @Prop({ type: Date, required: false, default: null })
  refreshTokenExpiresAt?: Date | null;

  // Require password change on first login
  @Prop({ type: Boolean, default: false })
  mustChangePassword?: boolean;

  // Independent student information - no reference to User table
  @Prop({ required: true, trim: true, maxlength: 120 })
  fullName: string;

  // Contact and profile fields filled by admin at registration
  @Prop({ required: false, trim: true, maxlength: 40 })
  phone?: string;

  @Prop({ required: false, trim: true, maxlength: 120 })
  emergencyContactName?: string;

  @Prop({ required: false, trim: true, maxlength: 40 })
  emergencyContactPhone?: string;

  @Prop({ required: false, trim: true, maxlength: 120 })
  occupation?: string;

  @Prop({ required: false, trim: true, maxlength: 80 })
  city?: string;

  @Prop({ required: false, trim: true, maxlength: 200 })
  address?: string;

  @Prop({
    required: true,
    trim: true,
    unique: true,
    index: true,
    maxlength: 20,
  })
  attendanceNumber: string;

  // Branch where student is learning (required only for physical learning)
  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false })
  branchId?: Types.ObjectId;

  // Learning type: physical or online
  @Prop({ type: String, enum: ['physical', 'online'], required: true })
  learningType: LearningType;

  // Instrument being learned
  @Prop({ type: String, enum: Object.values(InstrumentType), required: true })
  instrumentType: InstrumentType;

  // Program duration in months
  @Prop({ enum: [3, 6, 9], required: true })
  programDurationMonths: ProgramDuration;

  // Preferred learning days of the week
  @Prop({
    type: [String],
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true,
    validate: {
      validator: function(days: DayOfWeek[]) {
        // Validate days count matches program duration
        const expectedDays = this.programDurationMonths === 3 ? 5 
          : this.programDurationMonths === 6 ? 3 
          : 2;
        return days.length === expectedDays;
      },
      message: 'Number of learning days must match program duration (3 months = 5 days, 6 months = 3 days, 9 months = 2 days)',
    },
  })
  preferredLearningDays: DayOfWeek[];

  // Registration start date
  @Prop({ type: Date, required: true })
  registrationStartDate: Date;

  // Calculated learning days per week (derived from program duration)
  @Prop({ type: Number, required: true })
  learningDaysPerWeek: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, required: false, default: null })
  deletedAt?: Date | null;
}

export const StudentAttendanceParticipantSchema =
  SchemaFactory.createForClass(StudentAttendanceParticipant);

// Index for quick lookup by attendance number
StudentAttendanceParticipantSchema.index({ attendanceNumber: 1 });
StudentAttendanceParticipantSchema.index({ branchId: 1 });
StudentAttendanceParticipantSchema.index({ instrumentType: 1 });
StudentAttendanceParticipantSchema.index({ isActive: 1 });
StudentAttendanceParticipantSchema.index({ deletedAt: 1 });