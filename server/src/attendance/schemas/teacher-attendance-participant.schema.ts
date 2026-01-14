import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { InstrumentType } from '../../product/schemas/product.schema';

export type TeacherAttendanceParticipantDocument =
  TeacherAttendanceParticipant & Document;

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TeachingTimeRange {
  day: DayOfWeek;
  startTime: string; // Format: "HH:mm" (24-hour format)
  endTime: string;   // Format: "HH:mm" (24-hour format)
}

@Schema({ timestamps: true })
export class TeacherAttendanceParticipant {
  // Independent teacher information - no reference to User table
  @Prop({ required: true, trim: true, maxlength: 120 })
  fullName: string;

  // Instruments the teacher teaches (can teach multiple)
  @Prop({
    type: [String],
    enum: Object.values(InstrumentType),
    required: true,
    validate: {
      validator: (instruments: InstrumentType[]) => instruments.length > 0,
      message: 'Teacher must teach at least one instrument',
    },
  })
  instruments: InstrumentType[];

  // Days of the week the teacher teaches
  @Prop({
    type: [String],
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true,
    validate: {
      validator: (days: DayOfWeek[]) => days.length > 0,
      message: 'Teacher must have at least one teaching day',
    },
  })
  teachingDays: DayOfWeek[];

  // Time ranges for each teaching day
  @Prop({
    type: [
      {
        day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
      },
    ],
    required: true,
    validate: {
      validator: function(ranges: TeachingTimeRange[]) {
        // Each teaching day must have a corresponding time range
        return ranges.length === this.teachingDays.length &&
          ranges.every(range => this.teachingDays.includes(range.day));
      },
      message: 'Each teaching day must have a corresponding time range',
    },
  })
  timeRanges: TeachingTimeRange[];

  @Prop({ default: true })
  isActive: boolean;
}

export const TeacherAttendanceParticipantSchema = SchemaFactory.createForClass(
  TeacherAttendanceParticipant,
);

// Indexes for efficient queries
TeacherAttendanceParticipantSchema.index({ instruments: 1 });
TeacherAttendanceParticipantSchema.index({ teachingDays: 1 });
TeacherAttendanceParticipantSchema.index({ isActive: 1 });