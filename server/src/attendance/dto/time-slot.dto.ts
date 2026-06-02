import { IsEnum, IsString, Matches } from 'class-validator';

/** A single weekly session: a day + a start time ("HH:mm", 24h local). */
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

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:mm (24h)' })
  startTime: string;
}
