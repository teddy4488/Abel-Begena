import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StudentAttendanceDocument = StudentAttendance & Document;

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

@Schema({ timestamps: true })
export class StudentAttendance {
  @Prop({
    type: Types.ObjectId,
    ref: 'StudentAttendanceParticipant',
    required: true,
    index: true,
  })
  participantId: Types.ObjectId;

  // Store attendance number for quick lookup and audit trail
  @Prop({ required: true, trim: true, index: true })
  attendanceNumber: string;

  // Store student name for quick display (denormalized for performance)
  @Prop({ required: true, trim: true })
  studentName: string;

  // Date and time of the attendance session
  @Prop({ type: Date, required: true, index: true })
  sessionDate: Date;

  // Lesson for this session
  @Prop({ type: Types.ObjectId, ref: 'InstrumentLesson', required: true })
  lessonId: Types.ObjectId;

  // Optional revised lesson
  @Prop({ type: Types.ObjectId, ref: 'InstrumentLesson' })
  revisedLessonId?: Types.ObjectId;

  // Attendance status
  @Prop({
    type: String,
    enum: ['present', 'late', 'excused', 'absent'],
    default: 'present',
  })
  status: AttendanceStatus;

  // Admin who recorded this attendance
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy: Types.ObjectId;
}

export const StudentAttendanceSchema =
  SchemaFactory.createForClass(StudentAttendance);

// Indexes for efficient queries
StudentAttendanceSchema.index({ participantId: 1, sessionDate: -1 });
StudentAttendanceSchema.index({ attendanceNumber: 1, sessionDate: -1 });
StudentAttendanceSchema.index({ sessionDate: -1 });