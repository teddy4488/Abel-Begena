import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
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

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  paymentReference: string;

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
}
