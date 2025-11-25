import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClassService } from '../../class/class.service';

@Injectable()
export class ClassOwnerGuard implements CanActivate {
  constructor(private readonly classService: ClassService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const classId = request.params.id;

    if (!user) {
      throw new UnauthorizedException('Missing authentication context');
    }

    if (user.role === 'Admin') {
      return true;
    }

    const classEntity = await this.classService.findById(classId);

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return classEntity.instructorId?.toString() === user.sub;
  }
}

