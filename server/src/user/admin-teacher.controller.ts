import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('admin/teachers')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('Admin', 'SuperAdmin')
export class AdminTeacherController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findTeachers();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    if (!user || (user as { role?: string }).role !== 'Teacher') {
      throw new NotFoundException('Teacher not found');
    }
    return user;
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, { ...dto, role: 'Teacher' });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
