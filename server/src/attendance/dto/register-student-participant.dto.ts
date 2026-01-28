import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { InstrumentType } from '../../product/schemas/product.schema';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type LearningType = 'physical' | 'online';

export class RegisterStudentParticipantDto {
  @IsString()
  @MaxLength(120)
  @MinLength(2)
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(120)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

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

  @IsDateString()
  registrationStartDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @MinLength(3)
  attendanceNumber?: string;
}
