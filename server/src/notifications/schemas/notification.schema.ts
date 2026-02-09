import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  /**
   * Optional audience key for broadcast-style notifications,
   * e.g. \"all\", \"students\", \"teachers\", \"branch:<id>\".
   */
  @Prop({ type: String, index: true })
  audience?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  type: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 160 })
  title: string;

  @Prop({ type: String, trim: true, maxlength: 2000 })
  message?: string;

  @Prop({ type: Object })
  data?: Record<string, unknown>;

  @Prop({ type: Date })
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ audience: 1, createdAt: -1 });

