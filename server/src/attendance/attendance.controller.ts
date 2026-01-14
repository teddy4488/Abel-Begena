import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { RegisterTeacherParticipantDto } from './dto/register-teacher-participant.dto';
import { RegisterStudentParticipantDto } from './dto/register-student-participant.dto';
import { TeacherCheckInDto, TeacherCheckOutDto } from './dto/teacher-attendance.dto';
import { RecordStudentAttendanceDto } from './dto/record-student-attendance.dto';
import { RecordStudentPaymentDto } from './dto/student-payment.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('Admin')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // Participants
  @Post('teachers/register')
  registerTeacher(@Body() dto: RegisterTeacherParticipantDto) {
    return this.attendanceService.registerTeacherParticipant(dto);
  }

  @Post('students/register')
  registerStudent(@Body() dto: RegisterStudentParticipantDto) {
    return this.attendanceService.registerStudentParticipant(dto);
  }

  @Get('teachers/participants')
  listTeacherParticipants() {
    return this.attendanceService.listTeacherParticipants();
  }

  @Get('students/participants')
  listStudentParticipants() {
    return this.attendanceService.listStudentParticipants();
  }

  @Get('students/lookup/:attendanceNumber')
  getStudentByAttendanceNumber(@Param('attendanceNumber') attendanceNumber: string) {
    return this.attendanceService.getStudentByAttendanceNumber(attendanceNumber);
  }

  // Teacher attendance
  @Post('teachers/check-in')
  checkInTeacher(
    @Body() dto: TeacherCheckInDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.attendanceService.checkIn(dto, req.user.sub);
  }

  @Post('teachers/check-out')
  checkOutTeacher(
    @Body() dto: TeacherCheckOutDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.attendanceService.checkOut(dto, req.user.sub);
  }

  @Get('teachers/today')
  getTodayTeacherAttendance() {
    return this.attendanceService.getTodayTeacherAttendance();
  }

  // Student attendance
  @Post('students/record')
  recordStudentAttendance(
    @Body() dto: RecordStudentAttendanceDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.attendanceService.recordStudentAttendance(dto, req.user.sub);
  }

  // Billing / payments
  @Post('billing/pay')
  recordStudentPayment(
    @Body() dto: RecordStudentPaymentDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.attendanceService.recordStudentPayment(dto, req.user.sub);
  }

  @Get('billing/summary')
  getBillingSummary(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const parsedYear = year ? Number(year) : undefined;
    const parsedMonth = month ? Number(month) : undefined;
    return this.attendanceService.getStudentBillingSummary(parsedYear, parsedMonth);
  }

  // Lessons
  @Get('lessons')
  listLessons(@Query('instrumentType') instrumentType?: string) {
    return this.attendanceService.listInstrumentLessons(instrumentType);
  }

  @Post('lessons')
  createLesson(
    @Body() body: { instrumentType: string; title: string; code?: string; order?: number },
    @Request() req: { user: { sub: string } },
  ) {
    return this.attendanceService.createLesson(body);
  }

  @Put('lessons/:id')
  updateLesson(
    @Param('id') id: string,
    @Body() body: { title?: string; code?: string; order?: number; isActive?: boolean },
  ) {
    return this.attendanceService.updateLesson(id, body);
  }

  @Delete('lessons/:id')
  deleteLesson(@Param('id') id: string) {
    return this.attendanceService.deleteLesson(id);
  }
}
