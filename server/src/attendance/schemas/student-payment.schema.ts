import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { StudentAttendanceParticipant } from './student-attendance-participant.schema';

export type StudentPaymentDocument = StudentPayment & Document;

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

@Schema({ timestamps: true })
export class StudentPayment {
  @Prop({
    type: Types.ObjectId,
    ref: StudentAttendanceParticipant.name,
    required: true,
    index: true,
  })
  participantId: Types.ObjectId;

  @Prop({ type: Number, min: 2000, max: 999_999, required: true })
  amount: number;

  // Calendar month for which this payment applies (1-12)
  @Prop({ type: Number, min: 1, max: 12, required: true })
  month: number;

  @Prop({ type: Number, min: 2000, max: 9999, required: true })
  year: number;

  @Prop({
    type: String,
    enum: ['paid', 'partial', 'unpaid'],
    default: 'paid',
  })
  status: PaymentStatus;

  // Optional exact due date for bookkeeping
  @Prop({ type: Date })
  dueDate?: Date;

  // When the payment was actually received
  @Prop({ type: Date })
  paidAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy: Types.ObjectId;

  @Prop({ trim: true, maxlength: 240 })
  note?: string;
}

export const StudentPaymentSchema =
  SchemaFactory.createForClass(StudentPayment);

StudentPaymentSchema.index({ participantId: 1, year: 1, month: 1 }, { unique: true });
StudentPaymentSchema.index({ year: 1, month: 1 });
StudentPaymentSchema.index({ status: 1 });

