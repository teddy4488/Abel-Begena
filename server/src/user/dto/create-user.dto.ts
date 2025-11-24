export class CreateUserDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: 'User' | 'Teacher' | 'Admin';
}

