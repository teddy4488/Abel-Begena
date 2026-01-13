import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeacherAttendanceParticipantDocument =
  TeacherAttendanceParticipant & Document;

@Schema({ timestamps: true })
export class TeacherAttendanceParticipant {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ trim: true, maxlength: 120 })
  displayName?: string;
}

export const TeacherAttendanceParticipantSchema = SchemaFactory.createForClass(
  TeacherAttendanceParticipant,
);

