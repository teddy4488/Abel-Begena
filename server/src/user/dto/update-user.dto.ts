export class UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: 'User' | 'Teacher' | 'Admin';
  isActive?: boolean;
}

