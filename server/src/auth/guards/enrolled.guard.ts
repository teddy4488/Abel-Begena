import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

type RequestWithUser = Request & {
  user?: { role?: string };
};

@Injectable()
export class EnrolledGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Missing authentication context');
    }

    return (
      user.role === 'User' || user.role === 'Teacher' || user.role === 'Admin'
    );
  }
}
