import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentRequestDocument = PaymentRequest & Document;

export type PaymentRequestType = 'enrollment' | 'order' | 'tuition' | 'student_conversion' | 'student_monthly_fee';
export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected';

@Schema({ timestamps: true })
export class PaymentRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['enrollment', 'order', 'tuition', 'student_conversion', 'student_monthly_fee'],
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

  // Store conversion data as JSON string for student_conversion type
  @Prop({ type: String })
  conversionData?: string;
}

export const PaymentRequestSchema =
  SchemaFactory.createForClass(PaymentRequest);

PaymentRequestSchema.index({ type: 1, status: 1, createdAt: -1 });

