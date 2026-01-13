import { IsIn, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { InstrumentType } from '../../product/schemas/product.schema';

export class RegisterStudentParticipantDto {
  @IsMongoId()
  userId: string;

  @IsIn(Object.values(InstrumentType))
  instrumentType: InstrumentType;

  @IsIn([3, 6, 9])
  programDurationMonths: 3 | 6 | 9;

  @IsOptional()
  @IsMongoId()
  classId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  attendanceNumber?: string;
}

