import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClassDocument = Class & Document;

@Schema({ _id: false })
export class ClassEnrollment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  student: Types.ObjectId;

  @Prop({ default: Date.now })
  enrolledAt: Date;

  @Prop({
    type: String,
    enum: ['active', 'pending', 'withdrawn'],
    default: 'active',
  })
  status: 'active' | 'pending' | 'withdrawn';
}

export const ClassEnrollmentSchema =
  SchemaFactory.createForClass(ClassEnrollment);

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

  @Prop({ type: [ClassEnrollmentSchema], default: [] })
  enrollments: ClassEnrollment[];

  @Prop({ type: [ClassSessionSchema], default: [] })
  schedule: ClassSession[];
}

export const ClassSchema = SchemaFactory.createForClass(Class);
