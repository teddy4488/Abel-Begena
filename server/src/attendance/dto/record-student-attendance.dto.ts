import { IsMongoId, IsOptional, IsEnum, IsDateString, IsString, MaxLength } from 'class-validator';

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

export class RecordStudentAttendanceDto {
  @IsMongoId()
  participantId: string;

  /** Lesson covered. Required for present/late; optional for excused/absent. */
  @IsOptional()
  @IsMongoId()
  lessonId?: string;

  @IsOptional()
  @IsMongoId()
  revisedLessonId?: string;

  @IsOptional()
  @IsEnum(['present', 'late', 'excused', 'absent'])
  status?: AttendanceStatus;

  /** The session date (defaults to today). Backfill allowed; future dates rejected. */
  @IsOptional()
  @IsDateString()
  sessionDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;
}
