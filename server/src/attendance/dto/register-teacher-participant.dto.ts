import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterTeacherParticipantDto {
  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;
}

