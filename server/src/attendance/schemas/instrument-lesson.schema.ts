import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { InstrumentType } from '../../product/schemas/product.schema';

export type InstrumentLessonDocument = InstrumentLesson & Document;

export type LessonLevel = 'beginner' | 'advanced';

@Schema({ timestamps: true })
export class InstrumentLesson {
  @Prop({ type: String, enum: Object.values(InstrumentType), required: true })
  instrumentType: InstrumentType;

  @Prop({
    type: String,
    enum: ['beginner', 'advanced'],
    default: 'beginner',
    index: true,
  })
  level: LessonLevel;

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

InstrumentLessonSchema.index({ instrumentType: 1, level: 1, order: 1 });