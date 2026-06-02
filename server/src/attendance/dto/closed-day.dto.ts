import { IsDateString, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClosedDayDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
