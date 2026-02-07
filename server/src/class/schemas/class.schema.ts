import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InstrumentType } from '../../product/schemas/product.schema';

export type ClassDocument = Class & Document;

@Schema()
export class ClassSession {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 160 })
  title: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime?: Date;

  @Prop({ trim: true, maxlength: 160 })
  location?: string;

  @Prop({ trim: true, maxlength: 800 })
  notes?: string;
}

export const ClassSessionSchema = SchemaFactory.createForClass(ClassSession);

@Schema({ timestamps: true })
export class Class {
  @Prop({ required: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

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
    default: 'beginner',
    index: true,
  })
  level: 'beginner' | 'advanced';

  // Physical cohorts can be tied to a branch
  @Prop({ type: Types.ObjectId, ref: 'Branch', index: true })
  branchId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['online', 'physical', 'both'],
    default: 'online',
  })
  classType?: 'online' | 'physical' | 'both';

  @Prop({ type: Types.ObjectId, ref: 'User' })
  instructorId?: Types.ObjectId;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop({ min: 0 })
  capacity?: number;

  @Prop({
    type: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  materials: { title: string; url: string; uploadedAt: Date }[];

  @Prop({ default: false })
  isLive: boolean;

  @Prop()
  liveRoomCode?: string;


  @Prop({ type: [ClassSessionSchema], default: [] })
  schedule: ClassSession[];

  @Prop({ min: 0 })
  tuition?: number;

  @Prop({ trim: true, maxlength: 12, default: 'ETB' })
  currency?: string;

  @Prop()
  enrollmentDeadline?: Date;

  @Prop({ type: Date, required: false, default: null })
  deletedAt?: Date | null;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ClassSchema = SchemaFactory.createForClass(Class);
