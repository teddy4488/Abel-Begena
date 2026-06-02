import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

type ReqUser = { sub?: string; role?: string; branchId?: string };

@Controller('admin/teachers')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminTeacherController {
  constructor(private readonly userService: UserService) {}

  /** Admin sees only teachers in their branch; SuperAdmin sees all. */
  @Get()
  @Roles('Admin', 'SuperAdmin')
  findAll(@Request() req: { user?: ReqUser }) {
    const branchId = req.user?.role === 'Admin' ? req.user.branchId : undefined;
    return this.userService.findTeachers(branchId ? { branchId } : undefined);
  }

  /** Only SuperAdmin can create teachers. branchIds is required. */
  @Post()
  @Roles('SuperAdmin')
  @UseGuards(SuperAdminGuard)
  @AuditLog({ action: 'teacher_create', resource: 'teacher' })
  create(@Body() dto: CreateUserDto) {
    if (!dto.branchIds || dto.branchIds.length === 0) {
      throw new BadRequestException(
        'branchIds is required: a teacher must be assigned to at least one branch.',
      );
    }
    return this.userService.create({ ...dto, role: 'Teacher' });
  }

  @Get(':id')
  @Roles('Admin', 'SuperAdmin')
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    if (!user || (user as { role?: string }).role !== 'Teacher') {
      throw new NotFoundException('Teacher not found');
    }
    return user;
  }

  /**
   * Admin can update teacherStatus (approve/suspend) but not branchIds.
   * SuperAdmin can update everything including branchIds.
   */
  @Patch(':id')
  @Roles('Admin', 'SuperAdmin')
  @AuditLog({ action: 'teacher_update', resource: 'teacher', resourceIdParam: 'id' })
  update(
    @Request() req: { user?: ReqUser },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    if (req.user?.role === 'Admin') {
      // Admin may only change teacherStatus — strip branch assignment fields
      const { branchIds: _bi, branchId: _b, role: _r, ...safe } = dto as UpdateUserDto & { branchIds?: unknown };
      void _bi; void _b; void _r;
      return this.userService.update(id, { ...safe, role: 'Teacher' } as UpdateUserDto);
    }
    return this.userService.update(id, { ...dto, role: 'Teacher' });
  }

  @Delete(':id')
  @Roles('Admin', 'SuperAdmin')
  @AuditLog({ action: 'teacher_remove', resource: 'teacher', resourceIdParam: 'id' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
