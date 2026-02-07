import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InstrumentType } from '../../product/schemas/product.schema';

export type CourseTrackDocument = CourseTrack & Document;

export type CourseLevel = 'beginner' | 'advanced';

@Schema({ timestamps: true })
export class CourseTrack {
  @Prop({
    type: String,
    enum: Object.values(InstrumentType),
    required: true,
    index: true,
  })
  instrumentType: InstrumentType;

  @Prop({
    type: String,
    enum: ['beginner', 'advanced'],
    required: true,
    index: true,
  })
  level: CourseLevel;

  @Prop({ required: true, trim: true, maxlength: 160 })
  title: string;

  @Prop({ trim: true, maxlength: 800 })
  description?: string;

  /**
   * Optional explicit lesson list for this track.
   * If empty, lessons can be derived by querying InstrumentLesson by instrumentType + level.
   */
  @Prop({ type: [Types.ObjectId], ref: 'InstrumentLesson', default: [] })
  lessonIds?: Types.ObjectId[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, required: false, default: null })
  deletedAt?: Date | null;
}

export const CourseTrackSchema = SchemaFactory.createForClass(CourseTrack);

CourseTrackSchema.index({ instrumentType: 1, level: 1 }, { unique: true });
