import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateLiveStateDto {
  @IsOptional()
  @IsBoolean()
  isLive?: boolean;

  @IsOptional()
  @IsString()
  liveRoomCode?: string;
}
