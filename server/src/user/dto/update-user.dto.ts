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
  @IsIn(['User', 'Teacher', 'Admin', 'Student', 'SuperAdmin'])
  role?: 'User' | 'Teacher' | 'Admin' | 'Student' | 'SuperAdmin';

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

  @IsOptional()
  teacherProfile?: { teacherStatus?: 'pending' | 'approved' | 'suspended' };

  @IsOptional()
  studentProfile?: {
    attendanceNumber?: string;
    fullName?: string;
    branchId?: unknown;
    learningType?: 'physical' | 'online';
    instrumentType?: string;
    programDurationMonths?: 3 | 6 | 9;
    preferredLearningDays?: string[];
    registrationStartDate?: Date;
    learningDaysPerWeek?: number;
    isActive?: boolean;
    missedLessonsCount?: number;
  };

  @IsOptional()
  branchId?: string;
}
