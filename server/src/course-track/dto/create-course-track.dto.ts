import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { InstrumentType } from '../../product/schemas/product.schema';
import type { CourseLevel } from '../schemas/course-track.schema';

export class CreateCourseTrackDto {
  @IsEnum(InstrumentType)
  instrumentType: InstrumentType;

  @IsEnum(['beginner', 'advanced'])
  level: CourseLevel;

  @IsString()
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  description?: string;

  @IsOptional()
  @IsArray()
  lessonIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

