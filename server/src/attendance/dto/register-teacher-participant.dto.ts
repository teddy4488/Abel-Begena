import {
  IsArray,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InstrumentType } from '../../product/schemas/product.schema';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export class TeachingTimeRangeDto {
  @IsEnum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
  day: DayOfWeek;

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format (24-hour)',
  })
  startTime: string;

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format (24-hour)',
  })
  endTime: string;
}

export class RegisterTeacherParticipantDto {
  @IsString()
  @MaxLength(120)
  @MinLength(2)
  fullName: string;

  @IsArray()
  @IsEnum(Object.values(InstrumentType), { each: true })
  @IsNotEmpty()
  instruments: InstrumentType[];

  @IsArray()
  @IsEnum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], {
    each: true,
  })
  @IsNotEmpty()
  teachingDays: DayOfWeek[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeachingTimeRangeDto)
  @IsNotEmpty()
  timeRanges: TeachingTimeRangeDto[];
}
