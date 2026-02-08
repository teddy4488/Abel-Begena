import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsArray,
  ValidationOptions,
} from 'class-validator';

export type PaymentStatus = 'paid' | 'unpaid';

export class RecordStudentPaymentDto {
  @IsMongoId()
  participantId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  month: number; // 1-12

  @IsNumber()
  year: number;

  @IsEnum(['paid', 'unpaid'])
  status: PaymentStatus;

  /** Exact due date for this period (30 days after previous). When set, used for overdue/upcoming logic. */
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  // Optional enrollment period (1..24)
  @IsOptional()
  @IsNumber()
  period?: number;

  // Optional array of due dates (ISO date strings)
  @IsOptional()
  @IsArray()
  @IsDateString({}, { each: true })
  duedate?: string[];

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
