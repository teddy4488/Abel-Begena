import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: false })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  adminId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 80 })
  action: string;

  @Prop({ required: true, trim: true, maxlength: 60 })
  resource: string;

  @Prop({ trim: true, maxlength: 120 })
  resourceId?: string;

  @Prop({ type: Object })
  payload?: Record<string, unknown>;

  @Prop({ trim: true, maxlength: 45 })
  ip?: string;

  @Prop({ trim: true, maxlength: 512 })
  userAgent?: string;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ adminId: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });
