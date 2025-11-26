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

  login(user: Record<string, unknown>) {
    const plainUser = this.extractPlainUser(user);
    const safeUser = this.userService.toSafeUser(plainUser);
    const rawId =
      (safeUser as { _id?: { toString: () => string } })?._id ??
      (plainUser as { _id?: { toString: () => string } })?._id ??
      (plainUser as { id?: string })?.id;
    const payload = {
      sub: typeof rawId === 'string' ? rawId : (rawId?.toString?.() ?? ''),
      role:
        (safeUser as { role?: string })?.role ??
        (plainUser as { role?: string })?.role ??
        'User',
    };
    const accessToken = this.jwtService.sign(payload);
    const decoded = this.jwtService.decode(accessToken);
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    return {
      accessToken,
      user: safeUser,
      expiresAt,
    };
  }

  getSession(userId: string) {
    return this.userService.findById(userId);
  }

  private extractPlainUser(user: Record<string, unknown>) {
    const maybeDoc = user as { toObject?: () => Record<string, unknown> };
    return typeof maybeDoc.toObject === 'function' ? maybeDoc.toObject() : user;
  }
}
