import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { CreateCourseTrackDto } from './dto/create-course-track.dto';
import { UpdateCourseTrackDto } from './dto/update-course-track.dto';
import { CourseTrackService } from './course-track.service';

@Controller('course-tracks')
export class CourseTrackController {
  constructor(private readonly courseTrackService: CourseTrackService) {}

  @Get('public')
  listPublic() {
    return this.courseTrackService.listPublic();
  }

  @Get('manage')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  listManaged() {
    return this.courseTrackService.listManaged();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const track = await this.courseTrackService.findById(id);
    if (!track) {
      throw new BadRequestException('Course track not found');
    }
    return track;
  }

  @Post()
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  create(@Body() dto: CreateCourseTrackDto) {
    return this.courseTrackService.create(dto);
  }

  @Patch(':id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  update(@Param('id') id: string, @Body() dto: UpdateCourseTrackDto) {
    return this.courseTrackService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  remove(@Param('id') id: string) {
    return this.courseTrackService.remove(id);
  }
}

