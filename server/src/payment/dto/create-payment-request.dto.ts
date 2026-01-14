import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { PaymentRequestType } from '../schemas/payment-request.schema';

export class CreatePaymentRequestDto {
  @IsMongoId()
  userId: string;

  @IsEnum(['enrollment', 'order', 'tuition'])
  type: PaymentRequestType;

  @IsOptional()
  @IsMongoId()
  targetId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @MaxLength(12)
  currency: string;

  @IsString()
  @MaxLength(40)
  method: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  reviewNote?: string;
}

