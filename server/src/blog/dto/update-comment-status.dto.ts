import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateCommentStatusDto {
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'])
  status: 'pending' | 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  note?: string;
}
