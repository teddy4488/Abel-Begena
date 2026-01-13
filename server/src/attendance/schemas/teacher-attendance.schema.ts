import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeacherAttendanceDocument = TeacherAttendance & Document;

@Schema({ timestamps: true })
export class TeacherAttendance {
  @Prop({
    type: Types.ObjectId,
    ref: 'TeacherAttendanceParticipant',
    required: true,
    index: true,
  })
  participantId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  checkInAt: Date;

  @Prop({ type: Date })
  checkOutAt?: Date;

  @Prop({ min: 0 })
  durationMinutes?: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy: Types.ObjectId;
}

export const TeacherAttendanceSchema =
  SchemaFactory.createForClass(TeacherAttendance);

