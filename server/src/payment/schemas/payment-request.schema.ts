import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentRequestDocument = PaymentRequest & Document;

export type PaymentRequestType = 'enrollment' | 'order' | 'student_monthly_fee';
export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected';

@Schema({ timestamps: true })
export class PaymentRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['enrollment', 'order', 'student_monthly_fee'],
    required: true,
  })
  type: PaymentRequestType;

  // ID of the related entity (e.g., classId, orderId, or attendance participant id)
  @Prop({ type: Types.ObjectId, required: false })
  targetId?: Types.ObjectId | null;

  @Prop({ type: Number, min: 0, required: true })
  amount: number;

  @Prop({ type: String, trim: true, maxlength: 12, default: 'ETB' })
  currency: string;

  @Prop({ type: String, trim: true, maxlength: 40 })
  method: string;

  @Prop({ type: String, trim: true, maxlength: 120 })
  reference?: string;

  @Prop({ type: String, trim: true, maxlength: 400 })
  receiptUrl?: string;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  })
  status: PaymentRequestStatus;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: String, trim: true, maxlength: 400 })
  reviewNote?: string;

  // Store conversion data as JSON string for enrollment (e.g. student profile for convertUserToStudent)
  @Prop({ type: String })
  conversionData?: string;

  // Whether the post-approval side effects (enrollment activation, conversion, ledger
  // write, order update) have been applied. Used by the retry-side-effects repair flow.
  @Prop({ type: Boolean, default: false })
  sideEffectsApplied?: boolean;

  // The billing period this payment was applied to (for idempotent retry of monthly fees).
  @Prop({ type: Number })
  appliedPeriod?: number;

  @Prop({ type: Date, required: false, default: null })
  deletedAt?: Date | null;
}

export const PaymentRequestSchema =
  SchemaFactory.createForClass(PaymentRequest);

PaymentRequestSchema.index({ type: 1, status: 1, createdAt: -1 });
PaymentRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });
// DB-level idempotency: at most one PENDING request per (user, type, target, metadata).
// conversionData distinguishes monthly fees (month/year) and enrollment profiles; targetId
// distinguishes orders/enrollments. Partial filter scopes the constraint to pending rows.
PaymentRequestSchema.index(
  { userId: 1, type: 1, targetId: 1, conversionData: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

