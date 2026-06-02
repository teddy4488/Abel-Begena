import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export type PaymentStatus = 'paid' | 'unpaid' | 'waived';

export class RecordStudentPaymentDto {
  @IsMongoId()
  participantId: string;

  // Amount actually received now (ETB). For partial payments this is the partial
  // amount; for a waive it is ignored. 0 is allowed (e.g. waive).
  @IsNumber()
  @Min(0)
  amount: number;

  // Calendar month/year are optional metadata; billing is keyed by `period`.
  // When omitted, the service derives them from the period's window-start date.
  @IsOptional()
  @IsNumber()
  month?: number; // 1-12

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsEnum(['paid', 'unpaid', 'waived'])
  status: PaymentStatus;

  /**
   * Billing period (1..N) this payment settles. When omitted, the service targets
   * the next unsettled period for the participant.
   */
  @IsOptional()
  @IsNumber()
  @Min(1)
  period?: number;

  /**
   * Advance payment: number of consecutive periods this payment covers (default 1).
   * When > 1, the service settles `coversPeriods` periods starting at `period`.
   */
  @IsOptional()
  @IsNumber()
  @Min(1)
  coversPeriods?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;

  /** Optional URL to a receipt image/file associated with this payment */
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  receiptUrl?: string;
}

export class BillingStudentItemDto {
  participantId: string;
  fullName: string;
  attendanceNumber: string;
  instrumentType: string;
  status: PaymentStatus;
}

export class BillingSummaryDto {
  year: number;
  month: number;
  totalActiveStudents: number;
  paidCount: number;
  unpaidCount: number;
  items: BillingStudentItemDto[];
}
