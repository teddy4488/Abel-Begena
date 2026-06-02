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
  /** Required reference to User (role Student). All auth handled via User collection. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  // Independent student information
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

  // Preferred session start time per chosen day ("HH:mm", 90-min sessions).
  // Authoritative weekly schedule for the canonical student record.
  @Prop({
    type: [{ day: String, startTime: String }],
    default: [],
  })
  timeSlots?: { day: string; startTime: string }[];

  // Registration start date
  @Prop({ type: Date, required: true })
  registrationStartDate: Date;

  // Calculated learning days per week (derived from program duration)
  @Prop({ type: Number, required: true })
  learningDaysPerWeek: number;

  /**
   * Agreed monthly tuition fee (ETB), captured at conversion/registration from the
   * payment amount. Used as the expected fee for receipt validation and billing.
   */
  @Prop({ type: Number, min: 0 })
  monthlyFee?: number;

  /**
   * Admin override (signed) applied to the attendance-derived consumed-period count.
   * Lets the desk correct billing when attendance records are imperfect. Default 0.
   */
  @Prop({ type: Number, default: 0 })
  periodAdjustment?: number;

  /**
   * When true, this student is included in automated payment reminder emails.
   * Default false — billing is admin-decided; dunning is opt-in per student.
   */
  @Prop({ type: Boolean, default: false })
  autoReminders?: boolean;

  @Prop({ default: true })
  isActive: boolean;

  /**
   * Lifecycle status. `active` while studying; set when an admin reverts the
   * student to a regular user (the participant is then soft-deleted, preserving history).
   */
  @Prop({
    type: String,
    enum: ['active', 'completed', 'withdrawn', 'dropped'],
    default: 'active',
  })
  completionStatus?: 'active' | 'completed' | 'withdrawn' | 'dropped';

  /** When the student was reverted to a user (package completed / withdrew / dropped). */
  @Prop({ type: Date })
  completedAt?: Date;

  /** Accumulated count of lessons marked absent (for reporting). */
  @Prop({ type: Number, min: 0, default: 0 })
  missedLessonsCount?: number;

  @Prop({ type: Date, required: false, default: null })
  deletedAt?: Date | null;
}

export const StudentAttendanceParticipantSchema =
  SchemaFactory.createForClass(StudentAttendanceParticipant);

StudentAttendanceParticipantSchema.index({ branchId: 1 });
StudentAttendanceParticipantSchema.index({ instrumentType: 1 });
StudentAttendanceParticipantSchema.index({ isActive: 1 });
StudentAttendanceParticipantSchema.index({ deletedAt: 1 });