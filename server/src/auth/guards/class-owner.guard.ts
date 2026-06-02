import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ClassService } from '../../class/class.service';
import { userMatchesClassTeacher } from '../../class/class.constants';

type RequestWithUser = Request & {
  user?: { sub: string; role: string };
};

@Injectable()
export class ClassOwnerGuard implements CanActivate {
  constructor(private readonly classService: ClassService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const classId = request.params?.id;

    if (!user) {
      throw new UnauthorizedException('Missing authentication context');
    }

    // SuperAdmin and Admin can manage any class (branch scoping handled elsewhere).
    if (user.role === 'Admin' || user.role === 'SuperAdmin') {
      return true;
    }

    const classEntity = await this.classService.findById(classId);

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    // Any assigned teacher (lead, primary, or co-teacher) may manage the class.
    return userMatchesClassTeacher(classEntity, user.sub);
  }
}
