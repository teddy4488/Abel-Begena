import { IsArray, IsDateString, IsMongoId } from 'class-validator';

export class NoShowActionDto {
  @IsDateString()
  date: string;

  @IsArray()
  @IsMongoId({ each: true })
  participantIds: string[];
}
