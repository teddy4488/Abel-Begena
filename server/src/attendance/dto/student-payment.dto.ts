import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

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

  @IsEnum(['paid', 'partial', 'unpaid'])
  status: PaymentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
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
  partialCount: number;
  unpaidCount: number;
  items: BillingStudentItemDto[];
}
