import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ClassService } from './class.service';
import { AttendanceService } from '../attendance/attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { ClassOwnerGuard } from '../auth/guards/class-owner.guard';
import { UpdateLiveStateDto } from './dto/update-live-state.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CreateScheduleItemDto } from './dto/create-schedule-item.dto';
import { UpdateScheduleItemDto } from './dto/update-schedule-item.dto';
import { EnrollClassDto } from './dto/enroll-class.dto';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';
import { Request as ExpressRequest } from 'express';

@Controller('classes')
export class ClassController {
  constructor(
    private readonly classService: ClassService,
    private readonly attendanceService: AttendanceService,
  ) {}

  @Get('public')
  getPublicCatalog(
    @Query('instrumentType') instrumentType?: string,
    @Query('level') level?: 'beginner' | 'advanced',
  ) {
    return this.classService.getPublicCatalog(undefined, instrumentType, level);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Request() req: ExpressRequest & { user: { sub: string; role: string } },
  ) {
    return this.classService.findForUser(req.user);
  }

  @Get('manage')
  @Roles('Admin', 'SuperAdmin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  findManaged(
    @Request() req: ExpressRequest & { user: { sub: string; role?: string; branchId?: string } },
  ) {
    return this.classService.getManagedCatalog(req.user?.branchId);
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
  @UseGuards(JwtAuthGuard)
  getAccess(
    @Param('id') id: string,
    @Request() req: ExpressRequest & { user: { sub: string; role: string } },
  ) {
    return this.classService.getAccessPayload(id, req.user);
  }

  @Post(':id/enroll')
  @UseGuards(JwtAuthGuard)
  enrollInClass(
    @Param('id') id: string,
    @Body() enrollClassDto: EnrollClassDto,
    @Request() req: ExpressRequest & { user: { sub: string } },
  ) {
    return this.classService.enrollStudent(id, req.user.sub, enrollClassDto);
  }

  @Post(':id/enroll-with-receipt')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('receipt', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async enrollInClassWithReceipt(
    @Param('id') id: string,
    @Body() enrollClassDto: EnrollClassDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: ExpressRequest & { user: { sub: string } },
  ) {
    if (!file) {
      throw new BadRequestException('Receipt file is required');
    }
    const isAllowedType =
      file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    if (!isAllowedType) {
      throw new BadRequestException('Receipt must be an image or PDF');
    }
    return this.classService.enrollStudentWithReceipt(
      id,
      req.user.sub,
      enrollClassDto,
      file,
    );
  }

  @Get(':id/enrollment')
  @UseGuards(JwtAuthGuard)
  getEnrollmentStatus(
    @Param('id') id: string,
    @Request() req: ExpressRequest & { user: { sub: string } },
  ) {
    return this.classService.getEnrollmentDetail(id, req.user.sub);
  }

  @Get('enrollments/me')
  @UseGuards(JwtAuthGuard)
  getMyEnrollments(@Request() req: ExpressRequest & { user: { sub: string } }) {
    return this.classService.getStudentEnrollments(req.user.sub);
  }

  @Get('enrollments')
  @Roles('Admin', 'SuperAdmin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getAllEnrollments(
    @Query('status') status?: 'active' | 'pending' | 'withdrawn',
    @Request() req?: ExpressRequest & { user?: { role?: string; branchId?: string } },
  ) {
    const branchFilter = req?.user?.role === 'Admin' && req?.user?.branchId
      ? { branchId: String(req.user.branchId) }
      : undefined;
    return this.classService.getAllEnrollments(status, branchFilter);
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

  // Lessons (class-scoped)
  @Get('lessons')
  @Roles('Admin', 'Student', 'Teacher')
  @UseGuards(JwtAuthGuard, RoleGuard)
  listLessons(@Query('classId') classId?: string) {
    return this.attendanceService.listInstrumentLessons(classId);
  }

  @Post('lessons')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  createLesson(
    @Body()
    body: {
      classId: string;
      title: string;
      code?: string;
      order?: number;
    },
  ) {
    return this.attendanceService.createLesson(body);
  }

  @Put('lessons/:id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  updateLesson(
    @Param('id') id: string,
    @Body()
    body: {
      classId?: string;
      title?: string;
      code?: string;
      order?: number;
      isActive?: boolean;
    },
  ) {
    return this.attendanceService.updateLesson(id, body);
  }

  @Delete('lessons/:id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  deleteLesson(@Param('id') id: string) {
    return this.attendanceService.deleteLesson(id);
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

  @Patch(':id/enrollments/:studentId')
  @Roles('Teacher', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard, ClassOwnerGuard)
  updateEnrollmentStatus(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Body() updateEnrollmentStatusDto: UpdateEnrollmentStatusDto,
    @Request() req: ExpressRequest & { user: { sub: string } },
  ) {
    return this.classService.updateEnrollmentStatus(
      id,
      studentId,
      updateEnrollmentStatusDto,
      req.user.sub,
    );
  }
}
