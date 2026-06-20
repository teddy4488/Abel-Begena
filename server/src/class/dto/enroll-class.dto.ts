import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';

export enum ClassPaymentMethod {
  CHAPA = 'Chapa',
  TELEBIRR = 'Telebirr',
  STRIPE = 'Stripe',
  BANK = 'BankTransfer',
  MANUAL = 'Manual',
  OTHER = 'Other',
}

export class TimeSlotDto {
  @IsEnum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
  day:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';

  /** Local start time "HH:mm" (24h). */
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:mm (24h)' })
  startTime: string;
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

  /** Preferred time of learning (e.g. "12:00 PM LT") */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  preferredTime?: string;

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
  @Transform(({ value }) => {
    // Normalize multipart/form-data and JSON payloads:
    // - If value is already an array, keep it
    // - If value is a JSON-encoded array string (sent via FormData), parse it
    // - If value is a comma-separated string, split into an array
    // - Otherwise, wrap single value in an array
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          /* fall through to comma-split */
        }
      }
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    if (value == null) {
      return [];
    }
    return [value];
  })
  @IsEnum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], {
    each: true,
  })
  preferredLearningDays?: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>;

  @IsOptional()
  @IsDateString()
  registrationStartDate?: string;

  /**
   * Authoritative weekly schedule. One slot per session/week. May arrive as a JSON
   * string when submitted via multipart/form-data (enroll-with-receipt).
   */
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    // Parse JSON-encoded array from multipart/form-data, then class-transform each
    // element into a TimeSlotDto so ValidationPipe's `whitelist` recognizes day/startTime.
    // (Plain @Type after @Transform does NOT get applied, hence the explicit plainToInstance.)
    let arr: unknown[] = [];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        arr = Array.isArray(parsed) ? parsed : [];
      } catch {
        arr = [];
      }
    } else if (Array.isArray(value)) {
      arr = value;
    } else if (value != null) {
      arr = [value];
    }
    return arr.map((item) => plainToInstance(TimeSlotDto, item));
  })
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots?: TimeSlotDto[];
}
