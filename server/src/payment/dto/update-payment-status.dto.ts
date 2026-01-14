import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { PaymentRequestStatus } from '../schemas/payment-request.schema';

export class UpdatePaymentStatusDto {
  @IsMongoId()
  id: string;

  @IsEnum(['approved', 'rejected'])
  status: Exclude<PaymentRequestStatus, 'pending'>;

  @IsOptional()
  @IsString()
  reason?: string;
}

