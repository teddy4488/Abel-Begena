import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { StudentAttendanceParticipant } from './student-attendance-participant.schema';

export type StudentPaymentDocument = StudentPayment & Document;

export type PaymentStatus = 'paid' | 'unpaid';

@Schema({ timestamps: true })
export class StudentPayment {
  @Prop({
    type: Types.ObjectId,
    ref: StudentAttendanceParticipant.name,
    required: true,
    index: true,
  })
  participantId: Types.ObjectId;

  // Direct reference to User (canonical student identity) for unified queries
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ type: Number, min: 2000, max: 999_999, required: true })
  amount: number;

  // Calendar month for which this payment applies (1-12)
  @Prop({ type: Number, min: 1, max: 12, required: true })
  month: number;

  @Prop({ type: Number, min: 2000, max: 9999, required: true })
  year: number;

  @Prop({
    type: String,
    enum: ['paid', 'unpaid'],
    default: 'paid',
  })
  status: PaymentStatus;

  // Optional exact due date for bookkeeping
  @Prop({ type: Date })
  dueDate?: Date;

  // Array of scheduled due dates (30-day rolling schedule) for multi-month tracking
  @Prop({ type: [Date] })
  dueDates?: Date[];

  // When the payment was actually received
  @Prop({ type: Date })
  paidAt?: Date;

  // Enrollment period (1..24) indicating which month of enrollment this payment represents
  @Prop({ type: Number, min: 1 })
  period?: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy: Types.ObjectId;

  @Prop({ trim: true, maxlength: 240 })
  note?: string;

  // Optional URL to a receipt image/file
  @Prop({ type: String })
  receiptUrl?: string;
}

export const StudentPaymentSchema =
  SchemaFactory.createForClass(StudentPayment);

// 30-day rolling: multiple payments per month possible (e.g. due March 1 and March 31)
StudentPaymentSchema.index({ participantId: 1, year: 1, month: 1 });
StudentPaymentSchema.index({ userId: 1, year: 1, month: 1 });
StudentPaymentSchema.index({ participantId: 1, dueDate: 1 });
StudentPaymentSchema.index({ year: 1, month: 1 });
StudentPaymentSchema.index({ status: 1 });
// Index for quick lookup by enrollment period
StudentPaymentSchema.index({ participantId: 1, period: 1 });
// Prevent duplicate paid records per participant/month/year
StudentPaymentSchema.index(
  { participantId: 1, month: 1, year: 1 },
  { unique: true, partialFilterExpression: { status: 'paid' } },
);

