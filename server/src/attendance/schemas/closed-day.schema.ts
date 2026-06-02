import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClosedDayDocument = ClosedDay & Document;

/**
 * A day the school is closed. No-show review skips these. A null branchId means
 * the closure applies to all branches; a set branchId scopes it to one branch.
 */
@Schema({ timestamps: true })
export class ClosedDay {
  /** Normalized to local midnight of the closed day. */
  @Prop({ type: Date, required: true, index: true })
  date: Date;

  @Prop({ type: Types.ObjectId, ref: 'Branch', index: true })
  branchId?: Types.ObjectId;

  @Prop({ trim: true, maxlength: 200 })
  reason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const ClosedDaySchema = SchemaFactory.createForClass(ClosedDay);
ClosedDaySchema.index({ date: 1, branchId: 1 });
