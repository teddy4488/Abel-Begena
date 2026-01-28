import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ClassPaymentMethod {
  CHAPA = 'Chapa',
  TELEBIRR = 'Telebirr',
  STRIPE = 'Stripe',
  BANK = 'BankTransfer',
  MANUAL = 'Manual',
  OTHER = 'Other',
}

export class EnrollClassDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  currency?: string;

  @IsEnum(ClassPaymentMethod)
  paymentMethod: ClassPaymentMethod;

  // For receipt-based payments, paymentReference may be omitted.
  // For reference-based payments, the service will enforce it.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;

  // Optional intake profile for enrolled students
  @IsOptional()
  @IsString()
  @MaxLength(160)
  fullName?: string;

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
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  preferredDaysPerWeek?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  preferredSchedule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  learningGoals?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  notesForTeacher?: string;

  // Optional URL of an uploaded payment receipt (set by the server)
  @IsOptional()
  @IsString()
  @MaxLength(400)
  receiptUrl?: string;

  // Student conversion fields (for user-to-student migration upon enrollment approval)
  @IsOptional()
  @IsEnum(['physical', 'online'])
  learningType?: 'physical' | 'online';

  @ValidateIf((o) => o.learningType === 'physical')
  @IsMongoId()
  @IsNotEmpty()
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  instrumentType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn([3, 6, 9])
  programDurationMonths?: 3 | 6 | 9;

  @IsOptional()
  @IsArray()
  @IsEnum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], {
    each: true,
  })
  preferredLearningDays?: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>;

  @IsOptional()
  @IsDateString()
  registrationStartDate?: string;
}
