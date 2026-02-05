import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InstrumentType } from '../../product/schemas/product.schema';

export type InstrumentMaterialDocument = InstrumentMaterial & Document;

@Schema({ timestamps: true })
export class InstrumentMaterial {
  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ required: true })
  url: string;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true, index: true })
  classId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(InstrumentType),
  })
  instrumentType?: InstrumentType;

  @Prop({ type: Types.ObjectId, ref: 'InstrumentLesson', required: false })
  lessonId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  uploadedBy: Types.ObjectId;

  @Prop({ default: Date.now })
  uploadedAt: Date;

  @Prop({ trim: true, maxlength: 500 })
  description?: string;

  @Prop({
    type: String,
    enum: ['pdf', 'image', 'video', 'other'],
    default: 'other',
  })
  fileType?: 'pdf' | 'image' | 'video' | 'other';

  @Prop({ default: true })
  isActive: boolean;
}

export const InstrumentMaterialSchema =
  SchemaFactory.createForClass(InstrumentMaterial);

// Indexes for efficient queries
InstrumentMaterialSchema.index({ instrumentType: 1, isActive: 1 });
InstrumentMaterialSchema.index({ uploadedBy: 1 });
InstrumentMaterialSchema.index({ uploadedAt: -1 });
