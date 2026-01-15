import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { Teacher } from './schemas/teacher.schema';

@Controller('admin/teachers')
@Roles('Admin')
@UseGuards(JwtAuthGuard, RoleGuard)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get()
  findAll() {
    return this.teacherService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teacherService.findById(id);
  }

  @Post()
  create(
    @Body()
    createTeacherDto: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      teacherStatus?: 'pending' | 'approved' | 'suspended';
      isActive?: boolean;
      isVerified?: boolean;
    },
  ) {
    return this.teacherService.create(createTeacherDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTeacherDto: Partial<Teacher>) {
    return this.teacherService.update(id, updateTeacherDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teacherService.remove(id);
  }
}
