import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  IsUrl,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['User', 'Teacher', 'Admin', 'Student', 'SuperAdmin'])
  role?: 'User' | 'Teacher' | 'Admin' | 'Student' | 'SuperAdmin';

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsIn(['en', 'am'])
  languagePreference?: 'en' | 'am';

  @IsOptional()
  @IsIn(['pending', 'approved', 'suspended'])
  teacherStatus?: 'pending' | 'approved' | 'suspended';

  /** Branch for Admin. SuperAdmin only. */
  @IsOptional()
  @IsString()
  branchId?: string;

  /** Branches for Teacher. SuperAdmin only. At least one required when creating a teacher. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  branchIds?: string[];

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
