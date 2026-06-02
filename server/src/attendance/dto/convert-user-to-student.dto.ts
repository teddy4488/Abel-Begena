import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InstrumentType } from '../../product/schemas/product.schema';
import { TimeSlotDto } from './time-slot.dto';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type LearningType = 'physical' | 'online';

export class ConvertUserToStudentDto {
  // Student registration fields
  @IsString()
  @MaxLength(120)
  @MinLength(2)
  fullName: string;

  @ValidateIf((o) => o.learningType === 'physical')
  @IsMongoId()
  @IsNotEmpty()
  branchId?: string;

  @IsEnum(['physical', 'online'])
  learningType: LearningType;

  @IsEnum(Object.values(InstrumentType))
  instrumentType: InstrumentType;

  @IsIn([3, 6, 9])
  programDurationMonths: 3 | 6 | 9;

  @IsArray()
  @IsEnum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], {
    each: true,
  })
  preferredLearningDays: DayOfWeek[];

  @IsString()
  @MaxLength(240)
  @IsOptional()
  preferredSchedule?: string; // Time preferences per day (free text)

  /** Authoritative per-day session times (one per preferred learning day). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots?: TimeSlotDto[];

  @IsDateString()
  registrationStartDate: string;

  // Personal information
  @IsString()
  @MaxLength(40)
  @IsOptional()
  phone?: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @MaxLength(40)
  @IsOptional()
  emergencyContactPhone?: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  occupation?: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  city?: string;

  @IsString()
  @MaxLength(240)
  @IsOptional()
  address?: string;

  // Payment information
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @MaxLength(12)
  @IsOptional()
  currency?: string;

  @IsString()
  @MaxLength(40)
  @IsNotEmpty()
  paymentMethod: string;

  @IsString()
  @MaxLength(120)
  @IsNotEmpty()
  paymentReference: string;

  @IsString()
  @MaxLength(400)
  @IsOptional()
  note?: string;
}
