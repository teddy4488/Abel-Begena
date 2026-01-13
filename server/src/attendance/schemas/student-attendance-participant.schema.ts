import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InstrumentType } from '../../product/schemas/product.schema';

export type StudentAttendanceParticipantDocument =
  StudentAttendanceParticipant & Document;

export type ProgramDuration = 3 | 6 | 9;

@Schema({ timestamps: true })
export class StudentAttendanceParticipant {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    unique: true,
    index: true,
  })
  attendanceNumber: string;

  @Prop({ type: String, enum: Object.values(InstrumentType), required: true })
  instrumentType: InstrumentType;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: false })
  classId?: Types.ObjectId;

  @Prop({ enum: [3, 6, 9], required: true })
  programDurationMonths: ProgramDuration;

  @Prop({ default: true })
  isActive: boolean;
}

export const StudentAttendanceParticipantSchema =
  SchemaFactory.createForClass(StudentAttendanceParticipant);

