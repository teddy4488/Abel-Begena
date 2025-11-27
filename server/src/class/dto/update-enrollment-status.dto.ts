import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEnrollmentStatusDto {
  @IsEnum(['active', 'pending', 'withdrawn'], {
    message: 'Status must be active, pending, or withdrawn',
  })
  status: 'active' | 'pending' | 'withdrawn';

  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;
}
