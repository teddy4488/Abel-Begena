import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AdvertisementDocument = Advertisement & Document;

@Schema({ timestamps: true })
export class Advertisement {
  @Prop({ trim: true })
  title?: string;

  @Prop({ required: true })
  mediaUrl: string;

  @Prop({ required: true, enum: ['video', 'image'] })
  mediaType: 'video' | 'image';

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  startDate?: Date | null;

  @Prop({ type: Date, default: null })
  endDate?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;
}

export const AdvertisementSchema = SchemaFactory.createForClass(Advertisement);
