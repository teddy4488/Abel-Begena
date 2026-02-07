import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserService } from '../../user/user.service';

type RequestWithUser = Request & {
  user?: { sub?: string; role?: string; userType?: string };
};

/** Maps JWT role to expected userType (Phase 5.1: single User collection). */
const ROLE_TO_USER_TYPE: Record<string, string> = {
  Admin: 'admin',
  SuperAdmin: 'admin',
  Teacher: 'teacher',
  Student: 'student',
  User: 'website_user',
};

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (!requiredRoles.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (!user) {
      throw new UnauthorizedException('Missing authentication context');
    }

    const role = user.role;
    const userType = user.userType;

    // SuperAdmin can access any endpoint that allows Admin (system-wide oversight)
    if (role === 'SuperAdmin' && requiredRoles.includes('Admin')) {
      return true;
    }
    if (!role || !requiredRoles.includes(role)) {
      return false;
    }

    const expectedUserType = ROLE_TO_USER_TYPE[role];
    if (expectedUserType && userType !== expectedUserType) {
      return false;
    }

    // When Teacher role is required, only approved teachers may access (Phase 5.1: User.teacherProfile)
    if (requiredRoles.includes('Teacher') && role === 'Teacher' && userType === 'teacher' && user.sub) {
      const u = await this.userService.findById(user.sub);
      const status = (u as { teacherProfile?: { teacherStatus?: string } } | null)?.teacherProfile?.teacherStatus;
      if (!u || status !== 'approved') {
        throw new ForbiddenException(
          'Teacher access is restricted. Your account is pending approval or has been suspended.',
        );
      }
    }

    return true;
  }
}
