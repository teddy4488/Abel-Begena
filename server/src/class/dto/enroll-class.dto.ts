import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum ClassPaymentMethod {
  CHAPA = 'Chapa',
  TELEBIRR = 'Telebirr',
  STRIPE = 'Stripe',
  BANK = 'BankTransfer',
  MANUAL = 'Manual',
  OTHER = 'Other',
}

export class EnrollClassDto {
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
}
