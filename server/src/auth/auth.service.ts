import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  register(dto: CreateUserDto) {
    return this.userService.create({ ...dto, role: 'User' });
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await this.userService.comparePassword(
      password,
      user.password,
    );

    if (!isValid) {
      return null;
    }

    return this.userService.toSafeUser(
      typeof user.toObject === 'function' ? user.toObject() : user,
    );
  }

  async login(user: Record<string, any>) {
    const safeUser = this.userService.toSafeUser(user);
    const payload = {
      sub: safeUser?._id?.toString?.() ?? user._id ?? user.id,
      role: safeUser?.role ?? user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: safeUser,
    };
  }
}
