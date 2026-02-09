import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EnrollmentDocument = Enrollment & Document;

@Schema({ timestamps: true })
export class Enrollment {
  @Prop({ type: Types.ObjectId, ref: 'Class', required: true, index: true })
  classId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  studentId: Types.ObjectId;

  @Prop({ default: Date.now })
  enrolledAt: Date;

  @Prop({
    type: String,
    enum: ['active', 'pending', 'withdrawn'],
    default: 'active',
  })
  status: 'active' | 'pending' | 'withdrawn';

  @Prop({ type: Number, min: 0 })
  amountPaid?: number;

  @Prop({ trim: true, maxlength: 12 })
  currency?: string;

  @Prop({
    trim: true,
    maxlength: 40,
    enum: ['Chapa', 'Telebirr', 'Stripe', 'BankTransfer', 'Manual', 'Other'],
  })
  paymentMethod?: string;

  @Prop({ trim: true, maxlength: 120 })
  paymentReference?: string;

  @Prop({ trim: true, maxlength: 400 })
  note?: string;

  @Prop({ trim: true, maxlength: 160 })
  fullName?: string;

  @Prop({ trim: true, maxlength: 40 })
  phone?: string;

  @Prop({ trim: true, maxlength: 120 })
  emergencyContactName?: string;

  @Prop({ trim: true, maxlength: 40 })
  emergencyContactPhone?: string;

  @Prop({ trim: true, maxlength: 120 })
  occupation?: string;

  @Prop({ trim: true, maxlength: 120 })
  city?: string;

  @Prop({ trim: true, maxlength: 240 })
  address?: string;

  @Prop({ min: 1 })
  preferredDaysPerWeek?: number;

  @Prop({ trim: true, maxlength: 240 })
  preferredSchedule?: string;

  @Prop({ trim: true, maxlength: 240 })
  learningGoals?: string;

  @Prop({ trim: true, maxlength: 400 })
  notesForTeacher?: string;

  @Prop({ trim: true, maxlength: 400 })
  receiptUrl?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop({ type: String, enum: ['physical', 'online'] })
  learningType?: 'physical' | 'online';

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ trim: true, maxlength: 40 })
  instrumentType?: string;

  @Prop({ type: Number, enum: [3, 6, 9] })
  programDurationMonths?: 3 | 6 | 9;

  @Prop({
    type: [String],
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  })
  preferredLearningDays?: string[];

  @Prop({ trim: true, maxlength: 40 })
  preferredTime?: string;

  @Prop({ type: Date })
  registrationStartDate?: Date;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);
EnrollmentSchema.index({ classId: 1, studentId: 1 }, { unique: true });
EnrollmentSchema.index({ status: 1 });
EnrollmentSchema.index({ enrolledAt: -1 });
// Efficient queries for active enrollments per class
EnrollmentSchema.index({ status: 1, classId: 1 });
