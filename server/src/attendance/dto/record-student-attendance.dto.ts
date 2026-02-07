import { IsMongoId, IsOptional, IsEnum } from 'class-validator';

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

export class RecordStudentAttendanceDto {
  @IsMongoId()
  participantId: string;

  @IsMongoId()
  lessonId: string;

  @IsOptional()
  @IsMongoId()
  revisedLessonId?: string;

  @IsOptional()
  @IsEnum(['present', 'late', 'excused', 'absent'])
  status?: AttendanceStatus;
}
