import { IsIn, IsNotEmpty, IsOptional, IsString, IsMongoId } from 'class-validator';

export class RecordStudentAttendanceDto {
  @IsString()
  @IsNotEmpty()
  attendanceNumber: string;

  @IsMongoId()
  lessonId: string;

  @IsOptional()
  @IsMongoId()
  revisedLessonId?: string;

  @IsString()
  @IsIn(['present', 'late', 'excused'])
  status: 'present' | 'late' | 'excused';
}

