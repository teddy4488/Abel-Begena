import { IsMongoId } from 'class-validator';

export class TeacherCheckInDto {
  @IsMongoId()
  participantId: string;
}

export class TeacherCheckOutDto {
  @IsMongoId()
  participantId: string;
}

