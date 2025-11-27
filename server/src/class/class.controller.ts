import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ClassService } from './class.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EnrolledGuard } from '../auth/guards/enrolled.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { ClassOwnerGuard } from '../auth/guards/class-owner.guard';
import { UpdateLiveStateDto } from './dto/update-live-state.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CreateScheduleItemDto } from './dto/create-schedule-item.dto';
import { UpdateScheduleItemDto } from './dto/update-schedule-item.dto';

@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get('public')
  getPublicCatalog() {
    return this.classService.getPublicCatalog();
  }

  @Get()
  @UseGuards(JwtAuthGuard, EnrolledGuard)
  findAll() {
    return this.classService.findAll();
  }

  @Get('manage')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  findManaged() {
    return this.classService.getManagedCatalog();
  }

  @Post()
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  createClass(@Body() dto: CreateClassDto) {
    return this.classService.createClass(dto);
  }

  @Patch(':id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  updateClass(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.classService.updateClass(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  removeClass(@Param('id') id: string) {
    return this.classService.removeClass(id);
  }

  @Patch(':id/instructor/:instructorId')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  assignInstructor(
    @Param('id') id: string,
    @Param('instructorId') instructorId: string,
  ) {
    return this.classService.assignInstructor(id, instructorId);
  }

  @Get(':id/access')
  @UseGuards(JwtAuthGuard, EnrolledGuard)
  getAccess(@Param('id') id: string) {
    return this.classService.getAccessPayload(id);
  }

  @Get(':id/students')
  @Roles('Teacher', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard, ClassOwnerGuard)
  getStudents(@Param('id') id: string) {
    return this.classService.getClassRoster(id);
  }

  @Get(':id/schedule')
  @Roles('Teacher', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard, ClassOwnerGuard)
  getSchedule(@Param('id') id: string) {
    return this.classService.getClassSchedule(id);
  }

  @Post(':id/schedule')
  @Roles('Teacher', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard, ClassOwnerGuard)
  addScheduleItem(
    @Param('id') id: string,
    @Body() createScheduleItemDto: CreateScheduleItemDto,
  ) {
    return this.classService.addScheduleItem(id, createScheduleItemDto);
  }

  @Patch(':id/schedule/:sessionId')
  @Roles('Teacher', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard, ClassOwnerGuard)
  updateScheduleItem(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Body() updateScheduleItemDto: UpdateScheduleItemDto,
  ) {
    return this.classService.updateScheduleItem(
      id,
      sessionId,
      updateScheduleItemDto,
    );
  }

  @Delete(':id/schedule/:sessionId')
  @Roles('Teacher', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard, ClassOwnerGuard)
  removeScheduleItem(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.classService.removeScheduleItem(id, sessionId);
  }

  @Post(':id/materials')
  @Roles('Teacher', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard, ClassOwnerGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadMaterial(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Material file is required');
    }
    const updatedClass = await this.classService.appendMaterial(
      id,
      file,

      title || file.originalname,
    );
    return {
      message: 'Material uploaded successfully',
      materials: updatedClass.materials,
    };
  }

  @Patch(':id/live')
  @Roles('Teacher', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard, ClassOwnerGuard)
  updateLiveState(
    @Param('id') id: string,
    @Body() updateLiveStateDto: UpdateLiveStateDto,
  ) {
    return this.classService.updateLiveState(id, updateLiveStateDto);
  }
}
