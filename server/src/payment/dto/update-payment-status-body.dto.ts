import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import type { PaymentRequestStatus } from '../schemas/payment-request.schema';

/**
 * Body for `POST /payments/:id/decision`. Concrete class so the ValidationPipe runs
 * (the previous `Omit<UpdatePaymentStatusDto, 'id'>` carried no validation metadata).
 * `id` comes from the route param.
 */
export class UpdatePaymentStatusBodyDto {
  @IsEnum(['approved', 'rejected'])
  status: Exclude<PaymentRequestStatus, 'pending'>;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  reason?: string;
}
