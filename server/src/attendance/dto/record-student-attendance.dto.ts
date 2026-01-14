import { IsMongoId, IsOptional, IsEnum } from 'class-validator';

export type AttendanceStatus = 'present' | 'late' | 'excused';

export class RecordStudentAttendanceDto {
  @IsMongoId()
  participantId: string;

  @IsMongoId()
  lessonId: string;

  @IsOptional()
  @IsMongoId()
  revisedLessonId?: string;

  @IsOptional()
  @IsEnum(['present', 'late', 'excused'])
  status?: AttendanceStatus;
}
