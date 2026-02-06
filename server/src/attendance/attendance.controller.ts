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
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // Participants
  @Post('teachers/register')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  registerTeacher(@Body() dto: RegisterTeacherParticipantDto) {
    return this.attendanceService.registerTeacherParticipant(dto);
  }

  @Post('students/register')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  registerStudent(@Body() dto: RegisterStudentParticipantDto) {
    return this.attendanceService.registerStudentParticipant(dto);
  }

  @Post('students/convert')
  @UseGuards(JwtAuthGuard)
  convertUserToStudent(
    @Body() dto: import('./dto/convert-user-to-student.dto').ConvertUserToStudentDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.attendanceService.convertUserToStudent(req.user.sub, dto);
  }

  @Get('teachers/participants')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  listTeacherParticipants() {
    return this.attendanceService.listTeacherParticipants();
  }

  @Get('students/participants')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  listStudentParticipants() {
    return this.attendanceService.listStudentParticipants();
  }

  @Get('students/lookup/:attendanceNumber')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getStudentByAttendanceNumber(@Param('attendanceNumber') attendanceNumber: string) {
    return this.attendanceService.getStudentByAttendanceNumber(attendanceNumber);
  }

  @Get('students/search')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  searchStudents(@Query('q') query: string) {
    return this.attendanceService.searchStudents(query);
  }

  @Get('students/:id/details')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getStudentDetails(@Param('id') id: string) {
    return this.attendanceService.getStudentDetails(id);
  }

  @Patch('students/participants/:id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  updateStudentParticipant(
    @Param('id') id: string,
    @Body() updateData: Partial<{ isActive?: boolean; isVerified?: boolean }>,
  ) {
    return this.attendanceService.updateStudentParticipant(id, updateData);
  }

  @Delete('students/participants/:id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  removeStudentParticipant(@Param('id') id: string) {
    return this.attendanceService.removeStudentParticipant(id);
  }

  // Teacher attendance
  @Post('teachers/check-in')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  checkInTeacher(
    @Body() dto: TeacherCheckInDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.attendanceService.checkIn(dto, req.user.sub);
  }

  @Post('teachers/check-out')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  checkOutTeacher(
    @Body() dto: TeacherCheckOutDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.attendanceService.checkOut(dto, req.user.sub);
  }

  @Get('teachers/today')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getTodayTeacherAttendance() {
    return this.attendanceService.getTodayTeacherAttendance();
  }

  // Student attendance
  @Post('students/record')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  recordStudentAttendance(
    @Body() dto: RecordStudentAttendanceDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.attendanceService.recordStudentAttendance(dto, req.user.sub);
  }

  // Billing / payments
  @Post('billing/pay')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  recordStudentPayment(
    @Body() dto: RecordStudentPaymentDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.attendanceService.recordStudentPayment(dto, req.user.sub);
  }

  @Get('billing/summary')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getBillingSummary(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const parsedYear = year ? Number(year) : undefined;
    const parsedMonth = month ? Number(month) : undefined;
    return this.attendanceService.getStudentBillingSummary(parsedYear, parsedMonth);
  }

  // Graduation / certification eligibility
  @Get('graduation/eligibility')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getGraduationEligibility() {
    return this.attendanceService.getGraduationEligibility();
  }

  // Student endpoints (for students to view their own data)
  @Get('students/me/attendance')
  @Roles('Student', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getMyAttendance(@Request() req: { user: { sub: string; userType?: string } }) {
    // For students, use their student ID; for admins, this would need to be passed
    return this.attendanceService.getStudentAttendanceRecords(req.user.sub);
  }

  @Get('students/me/payments')
  @Roles('Student', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getMyPayments(@Request() req: { user: { sub: string; userType?: string } }) {
    return this.attendanceService.getStudentPayments(req.user.sub);
  }

  // Lessons
  @Get('lessons')
  @Roles('Admin', 'Student', 'Teacher')
  @UseGuards(JwtAuthGuard, RoleGuard)
  listLessons(
    @Query('classId') classId?: string,
  ) {
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
    @Request() req: { user: { sub: string } },
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

  // Admin attendance reporting - using existing endpoints
  @Get('reports')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getAttendanceReport(
    @Query('studentId') studentId?: string,
  ) {
    if (studentId) {
      // Return both attendance and payment reports for a specific student
      return Promise.all([
        this.attendanceService.getStudentAttendanceRecords(studentId),
        this.attendanceService.getStudentPayments(studentId),
      ]).then(([attendance, payments]) => ({
        attendance,
        payments,
      }));
    }
    // If no studentId, return billing summary
    return this.attendanceService.getStudentBillingSummary();
  }

  // Overdue payments
  @Get('payments/overdue')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getOverduePayments() {
    return this.attendanceService.getOverduePayments();
  }

  @Get('students/me/upcoming-payments')
  @UseGuards(JwtAuthGuard)
  getMyUpcomingPayments(
    @Request() req: { user: { sub: string } },
    @Query('daysAhead') daysAhead?: string,
  ) {
    const days = daysAhead ? parseInt(daysAhead, 10) : 14;
    if (isNaN(days) || days < 0) {
      throw new BadRequestException('Invalid daysAhead parameter');
    }
    return this.attendanceService.getUpcomingPayments(req.user.sub, days);
  }

  // Admin: upcoming payments for a specific student (useful for admin dashboards)
  @Get('students/:id/upcoming-payments')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getStudentUpcomingPayments(
    @Param('id') studentId: string,
    @Query('daysAhead') daysAhead?: string,
  ) {
    const days = daysAhead ? parseInt(daysAhead, 10) : 365; // default look ahead 1 year for admins
    if (isNaN(days) || days < 0) {
      throw new BadRequestException('Invalid daysAhead parameter');
    }
    return this.attendanceService.getUpcomingPayments(studentId, days);
  }

  // Report generation
  @Get('reports/student/:id/attendance')
  @Roles('Admin', 'Student', 'Teacher')
  @UseGuards(JwtAuthGuard, RoleGuard)
  generateStudentAttendanceReport(@Param('id') studentId: string) {
    return this.attendanceService.generateStudentAttendanceReport(studentId);
  }

  @Get('reports/student/:id/payments')
  @Roles('Admin', 'Student')
  @UseGuards(JwtAuthGuard, RoleGuard)
  generateStudentPaymentReport(@Param('id') studentId: string) {
    return this.attendanceService.generateStudentPaymentReport(studentId);
  }

  @Get('reports/teacher/:id/attendance')
  @Roles('Admin', 'Teacher')
  @UseGuards(JwtAuthGuard, RoleGuard)
  generateTeacherAttendanceReport(
    @Param('id') teacherId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.attendanceService.generateTeacherAttendanceReport(teacherId, start, end);
  }
}
