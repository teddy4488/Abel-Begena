import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { StudentAttendanceParticipant } from './student-attendance-participant.schema';

export type StudentPaymentDocument = StudentPayment & Document;

export type PaymentStatus = 'paid' | 'unpaid' | 'waived';

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

  // Fee recorded for this period (ETB). No hard floor — validated against the
  // participant's agreed monthlyFee at the service layer, not by a magic minimum.
  @Prop({ type: Number, min: 0, max: 999_999, required: true })
  amount: number;

  // Cumulative amount actually received for this period (supports partial payments).
  // A period is settled (status 'paid') once paidToDate >= amount.
  @Prop({ type: Number, min: 0, default: 0 })
  paidToDate?: number;

  // Calendar month for which this payment applies (1-12)
  @Prop({ type: Number, min: 1, max: 12, required: true })
  month: number;

  @Prop({ type: Number, min: 2000, max: 9999, required: true })
  year: number;

  @Prop({
    type: String,
    enum: ['paid', 'unpaid', 'waived'],
    default: 'paid',
  })
  status: PaymentStatus;

  // Window-start date for this billing period (display/sort only — billing is
  // attendance-driven, not date-driven). No longer a scheduled "due date".
  @Prop({ type: Date })
  dueDate?: Date;

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

// Billing is keyed by enrollment `period` (1..N). month/year are metadata only.
StudentPaymentSchema.index({ participantId: 1, year: 1, month: 1 });
StudentPaymentSchema.index({ userId: 1, year: 1, month: 1 });
StudentPaymentSchema.index({ participantId: 1, dueDate: 1 });
StudentPaymentSchema.index({ status: 1 });
// One ledger row per participant per billing period (the upsert key).
StudentPaymentSchema.index(
  { participantId: 1, period: 1 },
  { unique: true, partialFilterExpression: { period: { $exists: true } } },
);

