import {
  BadRequestException,
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

  /** Phase 5.1: No new Teacher documents; create teachers via User API with role Teacher. */
  @Post()
  create() {
    throw new BadRequestException(
      'Creating teachers is now done via the User API with role Teacher. Use the user management endpoint instead.',
    );
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
