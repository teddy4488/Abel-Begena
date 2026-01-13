import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { InstrumentType } from '../../product/schemas/product.schema';

export type InstrumentLessonDocument = InstrumentLesson & Document;

@Schema({ timestamps: true })
export class InstrumentLesson {
  @Prop({ type: String, enum: Object.values(InstrumentType), required: true })
  instrumentType: InstrumentType;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ trim: true, maxlength: 60 })
  code?: string;

  @Prop({ min: 0, default: 0 })
  order: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const InstrumentLessonSchema =
  SchemaFactory.createForClass(InstrumentLesson);

