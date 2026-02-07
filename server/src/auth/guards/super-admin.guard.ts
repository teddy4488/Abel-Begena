import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

type RequestWithUser = Request & {
  user?: { sub?: string; role?: string };
};

/** Allows only users with role SuperAdmin (Phase 5.3). */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Missing authentication context');
    }

    if (user.role !== 'SuperAdmin') {
      throw new ForbiddenException('SuperAdmin access required');
    }

    return true;
  }
}
