import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  IsUrl,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['User', 'Teacher', 'Admin'])
  role?: 'User' | 'Teacher' | 'Admin';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsIn(['pending', 'approved', 'suspended'])
  teacherStatus?: 'pending' | 'approved' | 'suspended';

  @IsOptional()
  @IsIn(['en', 'am'])
  languagePreference?: 'en' | 'am';
}
