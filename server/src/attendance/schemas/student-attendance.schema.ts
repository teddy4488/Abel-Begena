import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InstrumentType } from '../../product/schemas/product.schema';

export type StudentAttendanceDocument = StudentAttendance & Document;

export type AttendanceStatus = 'present' | 'late' | 'excused';

@Schema({ timestamps: true })
export class StudentAttendance {
  @Prop({
    type: Types.ObjectId,
    ref: 'StudentAttendanceParticipant',
    required: true,
    index: true,
  })
  participantId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  attendanceNumber: string;

  @Prop({ type: String, enum: Object.values(InstrumentType), required: true })
  instrumentType: InstrumentType;

  @Prop({ enum: [3, 6, 9], required: true })
  programDurationMonths: 3 | 6 | 9;

  @Prop({ type: Types.ObjectId, ref: 'InstrumentLesson', required: true })
  lessonId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'InstrumentLesson' })
  revisedLessonId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['present', 'late', 'excused'],
    default: 'present',
  })
  status: AttendanceStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy: Types.ObjectId;
}

export const StudentAttendanceSchema =
  SchemaFactory.createForClass(StudentAttendance);

