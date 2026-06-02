import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAttendanceDto {
  @IsOptional()
  @IsEnum(['present', 'late', 'excused', 'absent'])
  status?: 'present' | 'late' | 'excused' | 'absent';

  @IsOptional()
  @IsMongoId()
  lessonId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;
}
