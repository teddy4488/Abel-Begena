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

/**
 * Body for `POST /payments`. Concrete class (NOT `Omit<CreatePaymentRequestDto, 'userId'>`)
 * so the global ValidationPipe actually validates it — an Omit<> type carries no
 * class-validator metadata and is silently skipped. `userId` is taken from the JWT.
 */
export class CreatePaymentRequestBodyDto {
  @IsEnum(['enrollment', 'order', 'student_monthly_fee'])
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

  @IsOptional()
  @IsString()
  conversionData?: string;
}
