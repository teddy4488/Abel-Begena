import {
  IsDateString,
  IsEnum,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { InstrumentType } from '../../product/schemas/product.schema';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @IsEnum(InstrumentType)
  instrumentType: InstrumentType;

  @IsOptional()
  @IsEnum(['beginner', 'advanced'])
  level?: 'beginner' | 'advanced';

  /** Package duration in months (3/6/9). Drives sessions/week. */
  @IsOptional()
  @IsIn([3, 6, 9])
  durationMonths?: 3 | 6 | 9;

  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @IsOptional()
  @IsEnum(['online', 'physical', 'both'])
  classType?: 'online' | 'physical' | 'both';

  @IsOptional()
  @IsMongoId()
  instructorId?: string;

   /**
    * Optional list of additional teachers for this class (multi-teacher support).
    * The first teacher can be treated as primary if primaryInstructorId is not set.
    */
  @IsOptional()
  @IsMongoId({ each: true })
  teacherIds?: string[];

  /**
   * Optional primary instructor for display purposes when multiple teachers are assigned.
   * When provided, this should usually also appear in teacherIds.
   */
  @IsOptional()
  @IsMongoId()
  primaryInstructorId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tuition?: number;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  currency?: string;

  @IsOptional()
  @IsDateString()
  enrollmentDeadline?: string;
}
