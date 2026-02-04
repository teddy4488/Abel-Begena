import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserService } from '../user/user.service';
import { TeacherService } from '../teacher/teacher.service';
import {
  TeacherAttendanceParticipant,
  TeacherAttendanceParticipantDocument,
} from './schemas/teacher-attendance-participant.schema';
import {
  StudentAttendanceParticipant,
  StudentAttendanceParticipantDocument,
} from './schemas/student-attendance-participant.schema';
import {
  TeacherAttendance,
  TeacherAttendanceDocument,
} from './schemas/teacher-attendance.schema';
import {
  StudentAttendance,
  StudentAttendanceDocument,
} from './schemas/student-attendance.schema';
import {
  InstrumentLesson,
  InstrumentLessonDocument,
} from './schemas/instrument-lesson.schema';
import {
  StudentPayment,
  StudentPaymentDocument,
} from './schemas/student-payment.schema';
import { RegisterTeacherParticipantDto } from './dto/register-teacher-participant.dto';
import { RegisterStudentParticipantDto } from './dto/register-student-participant.dto';
import { TeacherCheckInDto, TeacherCheckOutDto } from './dto/teacher-attendance.dto';
import { RecordStudentAttendanceDto } from './dto/record-student-attendance.dto';
import { MailService } from '../mail/mail.service';
import { StudentService } from '../student/student.service';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(TeacherAttendanceParticipant.name)
    private readonly teacherParticipantModel: Model<TeacherAttendanceParticipantDocument>,
    @InjectModel(StudentAttendanceParticipant.name)
    private readonly studentParticipantModel: Model<StudentAttendanceParticipantDocument>,
    @InjectModel(TeacherAttendance.name)
    private readonly teacherAttendanceModel: Model<TeacherAttendanceDocument>,
    @InjectModel(StudentAttendance.name)
    private readonly studentAttendanceModel: Model<StudentAttendanceDocument>,
    @InjectModel(InstrumentLesson.name)
    private readonly lessonModel: Model<InstrumentLessonDocument>,
    @InjectModel(StudentPayment.name)
    private readonly studentPaymentModel: Model<StudentPaymentDocument>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly teacherService: TeacherService,
    private readonly mailService: MailService,
    private readonly studentService: StudentService,
  ) {}

  // Helpers
  private async generateAttendanceNumber(): Promise<string> {
    // Generate sequential number starting from 1
    // Find the highest existing attendance number
    const lastStudent = await this.studentParticipantModel
      .findOne()
      .sort({ attendanceNumber: -1 })
      .select('attendanceNumber')
      .lean()
      .exec();
    
    if (!lastStudent || !lastStudent.attendanceNumber) {
      return '1';
    }
    
    // Extract numeric part and increment
    const lastNumber = parseInt(lastStudent.attendanceNumber, 10);
    if (isNaN(lastNumber)) {
      return '1';
    }
    
    return (lastNumber + 1).toString();
  }

  private generateRandomPassword(): string {
    // Generate a secure random password (12 characters: letters, numbers, symbols)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));//a simple comment
    }
    return password;
  }

  private generateEmailFromName(fullName: string): string {
    // Generate email from name: "John Doe" -> "john.doe@abelbegena.com"
    const normalized = fullName
      .toLowerCase()
      .trim()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, '.');
    const timestamp = Date.now().toString().slice(-6);
    return `${normalized}.${timestamp}@abelbegena.com`;
  }

  private calculateLearningDaysPerWeek(programDurationMonths: 3 | 6 | 9): number {
    // 3 months = 5 days/week, 6 months = 3 days/week, 9 months = 2 days/week
    return programDurationMonths === 3 ? 5 
      : programDurationMonths === 6 ? 3 
      : 2;
  }

  // Participants
  async registerTeacherParticipant(dto: RegisterTeacherParticipantDto) {
    // Validate that each teaching day has a corresponding time range
    const teachingDaysSet = new Set(dto.teachingDays);
    const timeRangeDaysSet = new Set(dto.timeRanges.map(tr => tr.day));
    
    if (teachingDaysSet.size !== timeRangeDaysSet.size ||
        ![...teachingDaysSet].every(day => timeRangeDaysSet.has(day))) {
      throw new BadRequestException(
        'Each teaching day must have a corresponding time range',
      );
    }

    // Validate time ranges (endTime should be after startTime)
    for (const range of dto.timeRanges) {
      const [startHour, startMin] = range.startTime.split(':').map(Number);
      const [endHour, endMin] = range.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (endMinutes <= startMinutes) {
        throw new BadRequestException(
          `End time must be after start time for ${range.day}`,
        );
      }
    }

    // Email is required - validate it
    const email = dto.email.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email is required for teacher registration');
    }
    
    // Check if email already exists
    const existing = await this.teacherParticipantModel.findOne({ email }).lean().exec();
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    // Generate password
    const generatedPassword = this.generateRandomPassword();
    const hashedPassword = await this.studentService.hashPassword(generatedPassword);

    // Create teacher account
    try {
      const nameParts = dto.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      await this.teacherService.create({
        email,
        password: generatedPassword,
        firstName,
        lastName,
        teacherStatus: 'approved',
        isVerified: true,
      });
    } catch (error) {
      // If teacher creation fails, log but continue with teacher participant creation
      console.error('Failed to create teacher account:', error);
    }

    const created = await this.teacherParticipantModel.create({
      fullName: dto.fullName.trim(),
      email,
      password: hashedPassword,
      instruments: dto.instruments,
      teachingDays: dto.teachingDays,
      timeRanges: dto.timeRanges,
      isActive: true,
      isVerified: true, // Auto-verify since admin is creating
    });

    // Send credentials email
    try {
      await this.mailService.sendTeacherCredentialsEmail(
        email,
        generatedPassword,
        dto.fullName,
      );
    } catch (error) {
      // Log error but don't fail registration
      console.error('Failed to send credentials email:', error);
    }

    return {
      ...created.toObject(),
      password: undefined, // Don't return password in response
      generatedPassword: process.env.NODE_ENV !== 'production' ? generatedPassword : undefined, // Only in dev
    };
  }

  async registerStudentParticipant(dto: RegisterStudentParticipantDto) {
    // Validate learning days count matches program duration
    const expectedDays = this.calculateLearningDaysPerWeek(dto.programDurationMonths);
    if (dto.preferredLearningDays.length !== expectedDays) {
      throw new BadRequestException(
        `Program duration of ${dto.programDurationMonths} months requires exactly ${expectedDays} learning days per week. Provided: ${dto.preferredLearningDays.length}`,
      );
    }

    // Validate no duplicate days
    const uniqueDays = new Set(dto.preferredLearningDays);
    if (uniqueDays.size !== dto.preferredLearningDays.length) {
      throw new BadRequestException('Duplicate learning days are not allowed');
    }

    // Generate or validate attendance number
    let attendanceNumber = dto.attendanceNumber?.trim();
    if (!attendanceNumber) {
      attendanceNumber = await this.generateAttendanceNumber();
    }

    const conflict = await this.studentParticipantModel
      .findOne({ attendanceNumber })
      .lean()
      .exec();
    if (conflict) {
      throw new BadRequestException(
        'Attendance number already in use. Please choose another.',
      );
    }

    const learningDaysPerWeek = this.calculateLearningDaysPerWeek(
      dto.programDurationMonths,
    );

    // Email is required - validate it
    const email = dto.email.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email is required for student registration');
    }
    
    // Check if email already exists
    const existing = await this.studentParticipantModel.findOne({ email }).lean().exec();
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    // Generate password
    const generatedPassword = this.generateRandomPassword();
    const hashedPassword = await this.studentService.hashPassword(generatedPassword);

    // Validate branch for physical learning
    if (dto.learningType === 'physical' && !dto.branchId) {
      throw new BadRequestException('Branch is required for physical learning');
    }

    const created = await this.studentParticipantModel.create({
      fullName: dto.fullName.trim(),
      email,
      password: hashedPassword,
      attendanceNumber,
      phone: dto.phone?.trim(),
      emergencyContactName: dto.emergencyContactName?.trim(),
      emergencyContactPhone: dto.emergencyContactPhone?.trim(),
      occupation: dto.occupation?.trim(),
      city: dto.city?.trim(),
      address: dto.address?.trim(),
      branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : undefined,
      learningType: dto.learningType,
      instrumentType: dto.instrumentType,
      programDurationMonths: dto.programDurationMonths,
      preferredLearningDays: dto.preferredLearningDays,
      registrationStartDate: new Date(dto.registrationStartDate),
      learningDaysPerWeek,
      isActive: true,
      isVerified: true, // Auto-verify since admin is creating
      mustChangePassword: true, // Require password change on first login
    });

    // Send credentials email
    try {
      await this.mailService.sendStudentCredentialsEmail(
        email,
        generatedPassword,
        dto.fullName,
      );
    } catch (error) {
      // Log error but don't fail registration
      console.error('Failed to send credentials email:', error);
    }

    return {
      ...created.toObject(),
      password: undefined, // Don't return password in response
      generatedPassword: process.env.NODE_ENV !== 'production' ? generatedPassword : undefined, // Only in dev
    };
  }

  async convertUserToStudent(
    userId: string,
    dto: import('./dto/convert-user-to-student.dto').ConvertUserToStudentDto,
  ) {
    // Validate learning days count matches program duration
    const expectedDays = this.calculateLearningDaysPerWeek(dto.programDurationMonths);
    if (dto.preferredLearningDays.length !== expectedDays) {
      throw new BadRequestException(
        `Program duration of ${dto.programDurationMonths} months requires exactly ${expectedDays} learning days per week. Provided: ${dto.preferredLearningDays.length}`,
      );
    }

    // Validate no duplicate days
    const uniqueDays = new Set(dto.preferredLearningDays);
    if (uniqueDays.size !== dto.preferredLearningDays.length) {
      throw new BadRequestException('Duplicate learning days are not allowed');
    }

    // Validate branch is provided for physical learning
    if (dto.learningType === 'physical' && !dto.branchId) {
      throw new BadRequestException('Branch is required for physical learning');
    }

    // Get user to migrate
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has a student record
    const existingStudent = await this.studentParticipantModel
      .findOne({ email: user.email })
      .lean()
      .exec();
    if (existingStudent) {
      throw new BadRequestException('User already has a student account');
    }

    // Generate attendance number
    const attendanceNumber = await this.generateAttendanceNumber();
    const learningDaysPerWeek = this.calculateLearningDaysPerWeek(
      dto.programDurationMonths,
    );

    // Create student record with user's email and password
    const userDoc = await this.userService.findByEmail(user.email);
    const student = await this.studentParticipantModel.create({
      email: user.email,
      password: userDoc?.password, // Preserve password
      fullName: dto.fullName.trim(),
      attendanceNumber,
      branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : undefined,
      learningType: dto.learningType,
      instrumentType: dto.instrumentType,
      programDurationMonths: dto.programDurationMonths,
      preferredLearningDays: dto.preferredLearningDays,
      registrationStartDate: new Date(dto.registrationStartDate),
      learningDaysPerWeek,
      isActive: true,
      isVerified: user.isVerified ?? false, // Preserve verification status
    });

    // Delete user from User table
    await this.userService.remove(userId);

    return {
      message: 'User converted to student successfully',
      student: student.toObject(),
    };
  }

  async listTeacherParticipants() {
    return this.teacherParticipantModel
      .find({ isActive: true })
      .sort({ fullName: 1 })
      .lean()
      .exec();
  }

  async listStudentParticipants() {
    return this.studentParticipantModel
      .find({ isActive: true })
      .populate('branchId', 'name slug')
      .sort({ fullName: 1 })
      .lean()
      .exec();
  }

  async getStudentByAttendanceNumber(attendanceNumber: string) {
    const student = await this.studentParticipantModel
      .findOne({ attendanceNumber: attendanceNumber.trim(), isActive: true })
      .populate('branchId', 'name slug')
      .lean()
      .exec();

    if (!student) {
      throw new NotFoundException('Student not found with this attendance number');
    }

    return student;
  }

  async searchStudents(query: string) {
    const searchTerm = query.trim();
    // Allow 1-character searches (some attendance numbers can be single-digit)
    if (!searchTerm || searchTerm.length < 1) {
      return [];
    }

    // Search by attendance number (prefix/partial match) or name (partial match)
    // Note: attendance numbers are typically compact codes, so prefix matching is useful.
    const escapeRegExp = (value: string) =>
      value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safe = escapeRegExp(searchTerm);
    const students = await this.studentParticipantModel
      .find({
        isActive: true,
        $or: [
          { attendanceNumber: { $regex: safe, $options: 'i' } },
          { fullName: { $regex: safe, $options: 'i' } },
        ],
      })
      .populate('branchId', 'name slug')
      .sort({ fullName: 1 })
      .limit(20)
      .lean()
      .exec();

    return students;
  }

  async getStudentDetails(studentId: string) {
    const student = await this.studentParticipantModel
      .findById(studentId)
      .populate('branchId', 'name slug')
      .lean()
      .exec();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get last attendance record
    const lastAttendance = await this.studentAttendanceModel
      .findOne({ participantId: student._id })
      .populate('lessonId', 'title code order')
      .populate('revisedLessonId', 'title code order')
      .sort({ sessionDate: -1 })
      .lean()
      .exec();

    // Get total attendance count
    const totalAttendance = await this.studentAttendanceModel
      .countDocuments({ participantId: student._id })
      .exec();

    // Get payment summary
    const payments = await this.studentPaymentModel
      .find({ participantId: student._id })
      .sort({ year: -1, month: -1 })
      .lean()
      .exec();

    const paidMonths = payments.filter(p => p.status === 'paid').length;
    const unpaidMonths = payments.filter(p => p.status === 'unpaid').length;

    return {
      ...student,
      lastAttendance: lastAttendance || null,
      totalAttendance,
      paidMonths,
      unpaidMonths,
      totalPayments: payments.length,
    };
  }

  async updateStudentParticipant(
    id: string,
    updateData: Partial<StudentAttendanceParticipant>,
  ) {
    const student = await this.studentParticipantModel.findById(id).exec();
    if (!student) {
      throw new NotFoundException('Student participant not found');
    }

    Object.assign(student, updateData);
    await student.save();
    return this.studentParticipantModel
      .findById(id)
      .populate('branchId', 'name slug')
      .lean()
      .exec();
  }

  // Teacher attendance
  async checkIn(dto: TeacherCheckInDto, adminUserId: string) {
    const participant = await this.teacherParticipantModel
      .findById(dto.participantId)
      .exec();
    if (!participant || !participant.isActive) {
      throw new NotFoundException('Teacher participant not found or inactive');
    }

    // Check if there's an open session today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const openRecord = await this.teacherAttendanceModel
      .findOne({
        participantId: participant._id,
        checkInAt: { $gte: today, $lt: tomorrow },
        checkOutAt: { $exists: false },
      })
      .lean()
      .exec();
    
    if (openRecord) {
      throw new BadRequestException(
        'Teacher already has an open attendance session today',
      );
    }

    const now = new Date();
    const created = await this.teacherAttendanceModel.create({
      participantId: participant._id,
      checkInAt: now,
      recordedBy: new Types.ObjectId(adminUserId),
    });
    
    return created.toObject();
  }

  async checkOut(dto: TeacherCheckOutDto, adminUserId: string) {
    const participant = await this.teacherParticipantModel
      .findById(dto.participantId)
      .exec();
    if (!participant || !participant.isActive) {
      throw new NotFoundException('Teacher participant not found or inactive');
    }

    const openRecord = await this.teacherAttendanceModel
      .findOne({
        participantId: participant._id,
        checkOutAt: { $exists: false },
      })
      .exec();

    if (!openRecord) {
      throw new BadRequestException('No open attendance session to check out');
    }

    const now = new Date();
    openRecord.checkOutAt = now;
    const durationMs = now.getTime() - openRecord.checkInAt.getTime();
    openRecord.durationMinutes = Math.max(
      0,
      Math.round(durationMs / (1000 * 60)),
    );
    openRecord.recordedBy = new Types.ObjectId(adminUserId);

    await openRecord.save();
    return openRecord.toObject();
  }

  async getTodayTeacherAttendance() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const records = await this.teacherAttendanceModel
      .find({
        checkInAt: { $gte: start, $lte: end },
      })
      .populate('participantId', 'fullName instruments teachingDays')
      .populate('recordedBy', 'firstName lastName email')
      .sort({ checkInAt: -1 })
      .lean()
      .exec();
    return records;
  }

  // Student attendance
  async recordStudentAttendance(
    dto: RecordStudentAttendanceDto,
    adminUserId: string,
  ) {
    const participant = await this.studentParticipantModel
      .findById(dto.participantId)
      .exec();
    
    if (!participant || !participant.isActive) {
      throw new NotFoundException('Student participant not found or inactive');
    }

    // Validate lesson exists and matches instrument
    const lesson = await this.lessonModel
      .findOne({
        _id: new Types.ObjectId(dto.lessonId),
        instrumentType: participant.instrumentType,
        isActive: true,
      })
      .lean()
      .exec();
    
    if (!lesson) {
      throw new BadRequestException(
        'Lesson not found for the student instrument',
      );
    }

    // Validate revised lesson if provided
    let revisedLessonId: Types.ObjectId | undefined;
    if (dto.revisedLessonId) {
      const revisedLesson = await this.lessonModel
        .findOne({
          _id: new Types.ObjectId(dto.revisedLessonId),
          instrumentType: participant.instrumentType,
          isActive: true,
        })
        .lean()
        .exec();
      
      if (!revisedLesson) {
        throw new BadRequestException(
          'Revised lesson not found for the student instrument',
        );
      }
      revisedLessonId = new Types.ObjectId(dto.revisedLessonId);
    }

    const now = new Date();

    // Prevent accidental duplicates: allow at most one attendance record per participant per day.
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const existingToday = await this.studentAttendanceModel
      .findOne({
        participantId: participant._id,
        sessionDate: { $gte: startOfDay, $lte: endOfDay },
      })
      .lean()
      .exec();
    if (existingToday) {
      throw new BadRequestException(
        'Attendance already recorded for this student today.',
      );
    }

    const created = await this.studentAttendanceModel.create({
      participantId: participant._id,
      attendanceNumber: participant.attendanceNumber,
      studentName: participant.fullName,
      sessionDate: now,
      lessonId: new Types.ObjectId(dto.lessonId),
      revisedLessonId,
      status: dto.status || 'present',
      recordedBy: new Types.ObjectId(adminUserId),
    });

    return created.toObject();
  }

  async getStudentAttendanceRecords(studentId: string) {
    const participant = await this.studentParticipantModel.findById(studentId).exec();
    if (!participant) {
      throw new NotFoundException('Student participant not found');
    }

    const records = await this.studentAttendanceModel
      .find({ participantId: participant._id })
      .populate('lessonId', 'title code instrumentType')
      .populate('revisedLessonId', 'title code instrumentType')
      .sort({ sessionDate: -1 })
      .lean()
      .exec();

    return records;
  }

  async getStudentPayments(studentId: string) {
    const participant = await this.studentParticipantModel.findById(studentId).exec();
    if (!participant) {
      throw new NotFoundException('Student participant not found');
    }

    const payments = await this.studentPaymentModel
      .find({ participantId: participant._id })
      .sort({ year: -1, month: -1 })
      .lean()
      .exec();

    return payments;
  }

  async listInstrumentLessons(instrumentType?: string) {
    const filter: any = { isActive: true };
    if (instrumentType) {
      filter.instrumentType = instrumentType;
    }
    return this.lessonModel
      .find(filter)
      .sort({ order: 1, title: 1 })
      .lean()
      .exec();
  }

  // Lessons management
  async createLesson(data: {
    instrumentType: string;
    title: string;
    code?: string;
    order?: number;
  }) {
    const created = await this.lessonModel.create({
      instrumentType: data.instrumentType,
      title: data.title.trim(),
      code: data.code?.trim(),
      order: data.order ?? 0,
      isActive: true,
    });
    return created.toObject();
  }

  async updateLesson(lessonId: string, data: {
    title?: string;
    code?: string;
    order?: number;
    isActive?: boolean;
  }) {
    const lesson = await this.lessonModel.findById(lessonId).exec();
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (data.title !== undefined) lesson.title = data.title.trim();
    if (data.code !== undefined) lesson.code = data.code?.trim();
    if (data.order !== undefined) lesson.order = data.order;
    if (data.isActive !== undefined) lesson.isActive = data.isActive;

    await lesson.save();
    return lesson.toObject();
  }

  async deleteLesson(lessonId: string) {
    const result = await this.lessonModel.findByIdAndDelete(lessonId).exec();
    if (!result) {
      throw new NotFoundException('Lesson not found');
    }
    return { success: true };
  }

  // Graduation / certification eligibility

  private addMonths(date: Date, months: number) {
    const d = new Date(date.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
  }

  private getMonthKey(date: Date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  }

  /**
   * Compute graduation / certification eligibility for all active students.
   *
   * Rules (first version, can be tuned later):
   * - Expected program length = programDurationMonths (3 / 6 / 9)
   * - Expected months paid = programDurationMonths
   * - Required attendance sessions = programDurationMonths * 8
   * - eligible:
   *    monthsPaid >= expectedMonths AND totalSessions >= requiredSessions
   * - nearlyEligible:
   *    not eligible, but
   *    monthsPaid >= expectedMonths - 1 AND totalSessions >= requiredSessions * 0.7
   * - notEligible: everything else.
   */
  async getGraduationEligibility() {
    // Load all active students
    const students = await this.studentParticipantModel
      .find({ isActive: true })
      .select(
        '_id fullName attendanceNumber instrumentType branchId programDurationMonths registrationStartDate',
      )
      .lean()
      .exec();

    if (!students.length) {
      return [];
    }

    const participantIds = students.map((s) => s._id);

    // Aggregate attendance counts per participant
    const attendanceAgg = await this.studentAttendanceModel
      .aggregate([
        {
          $match: {
            participantId: { $in: participantIds },
          },
        },
        {
          $group: {
            _id: '$participantId',
            totalSessions: { $sum: 1 },
          },
        },
      ])
      .exec();

    const attendanceByParticipant = new Map<string, number>();
    attendanceAgg.forEach((row) => {
      attendanceByParticipant.set(String(row._id), row.totalSessions ?? 0);
    });

    // Aggregate payments (count months with status paid/partial)
    const paymentsAgg = await this.studentPaymentModel
      .aggregate([
        {
          $match: {
            participantId: { $in: participantIds },
            status: { $in: ['paid', 'partial'] },
          },
        },
        {
          $group: {
            _id: '$participantId',
            monthsPaid: { $sum: 1 },
          },
        },
      ])
      .exec();

    const paymentsByParticipant = new Map<string, number>();
    paymentsAgg.forEach((row) => {
      paymentsByParticipant.set(String(row._id), row.monthsPaid ?? 0);
    });

    const today = new Date();

    return students.map((student) => {
      const key = String(student._id);
      const totalSessions = attendanceByParticipant.get(key) ?? 0;
      const monthsPaid = paymentsByParticipant.get(key) ?? 0;

      const expectedMonths = student.programDurationMonths;
      const requiredSessions = expectedMonths * 8;

      // Compute program end date
      const registrationStart = new Date(student.registrationStartDate);
      const programEndDate = this.addMonths(
        registrationStart,
        student.programDurationMonths,
      );

      let status: 'eligible' | 'nearlyEligible' | 'notEligible' = 'notEligible';
      const reasons: string[] = [];

      if (monthsPaid >= expectedMonths && totalSessions >= requiredSessions) {
        status = 'eligible';
      } else if (
        monthsPaid >= Math.max(1, expectedMonths - 1) &&
        totalSessions >= Math.round(requiredSessions * 0.7)
      ) {
        status = 'nearlyEligible';
      } else {
        status = 'notEligible';
      }

      if (monthsPaid < expectedMonths) {
        reasons.push(
          `Tuition months paid: ${monthsPaid} / ${expectedMonths} expected`,
        );
      }

      if (totalSessions < requiredSessions) {
        reasons.push(
          `Attendance sessions: ${totalSessions} / ${requiredSessions} required`,
        );
      }

      if (today < programEndDate) {
        reasons.push('Program end date has not been reached yet');
      }

      return {
        participantId: key,
        fullName: student.fullName,
        attendanceNumber: student.attendanceNumber,
        instrumentType: student.instrumentType,
        branchId: student.branchId,
        programDurationMonths: student.programDurationMonths,
        registrationStartDate: student.registrationStartDate,
        programEndDate,
        totalSessions,
        monthsPaid,
        expectedMonths,
        requiredSessions,
        status,
        reasons,
      };
    });
  }

  // Billing / payments — 30-day rolling schedule from registration (approval) date
  private getCurrentYearMonth() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  private addDays(date: Date, days: number): Date {
    const out = new Date(date);
    out.setDate(out.getDate() + days);
    return out;
  }

  /** Due dates for periods 1, 2, 3, ...: reg+30, reg+60, reg+90, ... (start of day). */
  private getDueDatesFromRegistration(regDate: Date, maxCount: number): Date[] {
    const dates: Date[] = [];
    for (let n = 1; n <= maxCount; n += 1) {
      const d = this.addDays(regDate, n * 30);
      dates.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    return dates;
  }

  private sameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  /**
   * Returns the first unpaid due date that falls in the given month/year, for 30-day rolling schedule.
   * Used when approving a monthly payment so we can set dueDate on the record.
   */
  async getNextUnpaidDueDateInMonthYear(
    participantId: string,
    month: number,
    year: number,
  ): Promise<{ dueDate: Date; period: number } | null> {
    const participant = await this.studentParticipantModel
      .findById(participantId)
      .select('registrationStartDate')
      .lean()
      .exec();
    if (!participant) return null;

    const regDate = new Date(participant.registrationStartDate || new Date());
    const regStartOfDay = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate());
    const dueDates = this.getDueDatesFromRegistration(regStartOfDay, 24);

    const payments = await this.studentPaymentModel
      .find({ participantId: new Types.ObjectId(participantId) })
      .select('duedate status period month year paidAt')
      .lean()
      .exec();

    for (let i = 0; i < dueDates.length; i += 1) {
      const dueDate = dueDates[i];
      const period = i + 1;
      if (dueDate.getMonth() + 1 !== month || dueDate.getFullYear() !== year) continue;

      const paid = payments.some((p: any) => {
        if (p.duedate && Array.isArray(p.duedate) && p.duedate.length > 0) {
          if (p.period && p.period >= 1 && p.period <= p.duedate.length) {
            return this.sameDay(new Date(p.duedate[p.period - 1]), dueDate) && p.status === 'paid';
          }
          if (p.duedate.some((d: Date) => this.sameDay(new Date(d), dueDate))) {
            return (p.status === 'paid') && ((p.paidAt && this.sameDay(new Date(p.paidAt), dueDate)) || (p.month === dueDate.getMonth() + 1 && p.year === dueDate.getFullYear()));
          }
        }
        if (p.month === dueDate.getMonth() + 1 && p.year === dueDate.getFullYear()) {
          return p.status === 'paid';
        }
        return false;
      });

      if (!paid) return { dueDate, period };
    }
    return null;
  }

  async recordStudentPayment(
    dto: import('./dto/student-payment.dto').RecordStudentPaymentDto,
    adminUserId: string,
  ) {
    const participant = await this.studentParticipantModel
      .findById(dto.participantId)
      .exec();

    if (!participant || !participant.isActive) {
      throw new NotFoundException('Student participant not found or inactive');
    }

    let month = dto.month;
    let year = dto.year;

    if (month < 1 || month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }

    // Normalize input and find any existing payment for the same participant/month/year/period
    // Note: we no longer rely on per-record `dueDate` (single date); scheduling is kept in `duedate` array

    const existingQuery: any = {
      participantId: participant._id,
      month,
      year,
    };
    if (dto.period) existingQuery.period = dto.period;
    const existing = await this.studentPaymentModel.findOne(existingQuery).exec();

    if (existing) {
      existing.amount = dto.amount;
      existing.status = dto.status;
      existing.note = dto.note;
      existing.paidAt =
        dto.status === 'paid' || dto.status === 'partial'
          ? new Date()
          : undefined;
      // If an existing record was updated to paid and has no duedate array, generate it
      if ((dto.status === 'paid' || dto.status === 'partial') && (!existing.duedate || existing.duedate.length === 0)) {
        let duedates: Date[] = [];
        // If admin provided a period, generate schedule from registration so it aligns with enrollment schedule
        if (dto.period) {
          const regDate = new Date(participant.registrationStartDate || new Date());
          const regStartOfDay = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate());
          duedates = this.getDueDatesFromRegistration(regStartOfDay, 24);
          existing.period = dto.period;
        } else {
          // fallback: generate from paidAt
          const baseDate = existing.paidAt ?? new Date();
          duedates = (() => {
            const arr: Date[] = [];
            for (let i = 1; i <= 24; i += 1) {
              arr.push(this.addDays(baseDate, i * 30));
            }
            return arr;
          })();
          // set period if missing
          if (!existing.period) {
            const lastPeriod = await this.studentPaymentModel
              .find({ participantId: participant._id })
              .sort({ period: -1 })
              .limit(1)
              .select('period')
              .lean()
              .exec();
            existing.period = (lastPeriod[0]?.period ?? 0) + 1 || 1;
          }
        }
        existing.duedate = duedates;
      }
      existing.recordedBy = new Types.ObjectId(adminUserId);
      // attach receipt if provided
      if (dto.receiptUrl) {
        existing.receiptUrl = dto.receiptUrl;
      }
      await existing.save();
      return existing.toObject();
    }

    // Determine enrollment period automatically if not provided
    let periodToSet: number | undefined = dto.period;
    if (!periodToSet) {
      const lastPeriod = await this.studentPaymentModel
        .find({ participantId: participant._id })
        .sort({ period: -1 })
        .limit(1)
        .select('period')
        .lean()
        .exec();
      periodToSet = (lastPeriod[0]?.period ?? 0) + 1 || 1;
    }

    const paidAtDate = (dto.status === 'paid' || dto.status === 'partial') ? new Date() : undefined;

    // Build duedate schedule:
    // - If a period is provided (admin-approved monthly payment), derive the 24-item schedule from registrationStartDate so entries align with enrollment schedule.
    // - Otherwise, if paid right now, generate a schedule from paidAt as a fallback (existing behavior).
    let duedates: Date[] | undefined = undefined;
    if (dto.status === 'paid' || dto.status === 'partial') {
      if (periodToSet) {
        const regDate = new Date(participant.registrationStartDate || new Date());
        const regStartOfDay = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate());
        duedates = this.getDueDatesFromRegistration(regStartOfDay, 24);
      } else {
        const baseDateForDues = paidAtDate ?? new Date();
        duedates = (() => {
          const arr: Date[] = [];
          for (let i = 1; i <= 24; i += 1) {
            arr.push(this.addDays(baseDateForDues, i * 30));
          }
          return arr;
        })();
      }
    }

    // Normalize scalar `dueDate` if provided; otherwise, prefer duedates[period-1] when available
    let dueDateNormalized: Date | undefined = undefined;
    if (dto.dueDate) {
      const parsed = new Date(dto.dueDate);
      if (!isNaN(parsed.getTime())) {
        dueDateNormalized = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
    } else if (duedates && periodToSet && Number.isInteger(periodToSet) && periodToSet >= 1 && periodToSet <= duedates.length) {
      dueDateNormalized = new Date(duedates[periodToSet - 1]);
    } else if (duedates && duedates.length > 0) {
      // fallback to first scheduled date if nothing else
      dueDateNormalized = new Date(duedates[0]);
    }

    const created = await this.studentPaymentModel.create({
      participantId: participant._id,
      amount: dto.amount,
      month,
      year,
      status: dto.status,
      dueDate: dueDateNormalized,
      duedate: duedates,
      period: periodToSet,
      paidAt: paidAtDate,
      recordedBy: new Types.ObjectId(adminUserId),
      note: dto.note,
      receiptUrl: dto.receiptUrl,
    });

    return created.toObject();
  }

  async getStudentBillingSummary(year?: number, month?: number) {
    const current = this.getCurrentYearMonth();
    const targetYear = year ?? current.year;
    const targetMonth = month ?? current.month;

    // Load all active students
    const students = await this.studentParticipantModel
      .find({ isActive: true })
      .select('_id fullName attendanceNumber instrumentType')
      .lean()
      .exec();

    const totalActiveStudents = students.length;
    if (totalActiveStudents === 0) {
      return {
        year: targetYear,
        month: targetMonth,
        totalActiveStudents: 0,
        paidCount: 0,
        partialCount: 0,
        unpaidCount: 0,
      };
    }

    const studentIds = students.map((s) => s._id);

    const payments = await this.studentPaymentModel
      .find({
        participantId: { $in: studentIds },
        year: targetYear,
        month: targetMonth,
      })
      .select('participantId status')
      .lean()
      .exec();

    const paymentByParticipant = new Map<string, 'paid' | 'partial' | 'unpaid'>();
    payments.forEach((p) => {
      const key = String(p.participantId);
      // If multiple records somehow exist, prefer "paid" over "partial"/"unpaid"
      const existing = paymentByParticipant.get(key);
      if (!existing || p.status === 'paid') {
        paymentByParticipant.set(key, p.status);
      }
    });

    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    const items: {
      participantId: string;
      fullName: string;
      attendanceNumber: string;
      instrumentType: string;
      status: 'paid' | 'partial' | 'unpaid';
    }[] = [];

    students.forEach((student) => {
      const id = student._id;
      const status = paymentByParticipant.get(String(id));
      if (!status || status === 'unpaid') {
        unpaidCount += 1;
        items.push({
          participantId: String(id),
          fullName: student.fullName,
          attendanceNumber: student.attendanceNumber,
          instrumentType: student.instrumentType,
          status: 'unpaid',
        });
      } else if (status === 'partial') {
        partialCount += 1;
        items.push({
          participantId: String(id),
          fullName: student.fullName,
          attendanceNumber: student.attendanceNumber,
          instrumentType: student.instrumentType,
          status: 'partial',
        });
      } else if (status === 'paid') {
        paidCount += 1;
        items.push({
          participantId: String(id),
          fullName: student.fullName,
          attendanceNumber: student.attendanceNumber,
          instrumentType: student.instrumentType,
          status: 'paid',
        });
      }
    });

    return {
      year: targetYear,
      month: targetMonth,
      totalActiveStudents,
      paidCount,
      partialCount,
      unpaidCount,
      items,
    };
  }

  async getOverduePayments() {
    const currentDate = new Date();

    const students = await this.studentParticipantModel
      .find({ isActive: true })
      .select('_id fullName attendanceNumber instrumentType registrationStartDate')
      .lean()
      .exec();

    const studentIds = students.map((s) => s._id);
    // include duedate array and other metadata in the payments map so overdue logic can match by period/index
    const paymentsByParticipant = new Map<string, Array<{ dueDate?: Date; duedate?: Date[]; period?: number; month?: number; year?: number; paidAt?: Date; status: string; amount?: number }>>();
    const allPayments = await this.studentPaymentModel
      .find({ participantId: { $in: studentIds } })
      .select('participantId dueDate status amount duedate period month year paidAt')
      .lean()
      .exec();
    allPayments.forEach((p) => {
      const key = String(p.participantId);
      if (!paymentsByParticipant.has(key)) paymentsByParticipant.set(key, []);
      paymentsByParticipant.get(key)!.push({
        dueDate: p.dueDate,
        duedate: p.duedate,
        period: p.period,
        month: p.month,
        year: p.year,
        paidAt: p.paidAt,
        status: p.status,
        amount: p.amount,
      });
    });

    const overduePayments: Array<{
      participantId: string;
      fullName: string;
      attendanceNumber: string;
      instrumentType: string;
      year: number;
      month: number;
      dueDate: Date;
      daysOverdue: number;
      amount?: number;
      status?: 'paid' | 'partial' | 'unpaid';
    }> = [];

    for (const student of students) {
      const regDate = new Date(student.registrationStartDate || new Date());
      const regStartOfDay = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate());
      const dueDates = this.getDueDatesFromRegistration(regStartOfDay, 24);
      const payments = paymentsByParticipant.get(String(student._id)) ?? [];

      for (const dueDate of dueDates) {
        if (dueDate >= currentDate) break;

        // Find a payment that maps to this dueDate (prefer period-indexed matches)
        let matchedPayment: any = null;
        let matchedIndex: number | null = null;
        for (const p of payments) {
          if (p.duedate && Array.isArray(p.duedate) && p.duedate.length > 0) {
            const idx = p.duedate.findIndex((d: Date) => this.sameDay(new Date(d), dueDate));
            if (idx >= 0) {
              matchedPayment = p;
              matchedIndex = idx;
              break;
            }
          }
          if (p.month === dueDate.getMonth() + 1 && p.year === dueDate.getFullYear()) {
            matchedPayment = p;
            matchedIndex = null;
            break;
          }
        }

        const paidForThisDue = matchedPayment ? (
          matchedPayment.period && matchedIndex !== null
            ? (matchedPayment.period - 1 === matchedIndex && matchedPayment.status === 'paid')
            : (matchedPayment.status === 'paid' && ((matchedPayment.paidAt && this.sameDay(new Date(matchedPayment.paidAt), dueDate)) || (matchedPayment.month === dueDate.getMonth() + 1 && matchedPayment.year === dueDate.getFullYear())))
        ) : false;

        const partialOrUnpaid = matchedPayment && (matchedPayment.status === 'partial' || matchedPayment.status === 'unpaid') ? matchedPayment : undefined;

        if (!paidForThisDue) {
          const daysOverdue = Math.floor(
            (currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          overduePayments.push({
            participantId: String(student._id),
            fullName: student.fullName,
            attendanceNumber: student.attendanceNumber,
            instrumentType: student.instrumentType,
            year: dueDate.getFullYear(),
            month: dueDate.getMonth() + 1,
            dueDate,
            daysOverdue,
            amount: partialOrUnpaid?.amount,
            status: (partialOrUnpaid?.status as 'unpaid' | 'partial') || 'unpaid',
          });
        }
      }
    }

    overduePayments.sort((a, b) => b.daysOverdue - a.daysOverdue);
    return overduePayments;
  }

  async getUpcomingPayments(studentId: string, daysAhead: number = 14) {
    const participant = await this.studentParticipantModel.findById(studentId).exec();
    if (!participant) {
      throw new NotFoundException('Student participant not found');
    }

    const currentDate = new Date();
    const futureDate = new Date();
    futureDate.setDate(currentDate.getDate() + daysAhead);

    const regDate = new Date(participant.registrationStartDate || new Date());
    const regStartOfDay = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate());
    const dueDates = this.getDueDatesFromRegistration(regStartOfDay, 24);

    const payments = await this.studentPaymentModel
      .find({ participantId: participant._id })
      .select('duedate status amount period month year paidAt')
      .lean()
      .exec();

    const upcomingPayments: Array<{
      year: number;
      month: number;
      dueDate: Date;
      duedate?: Date[];
      period?: number;
      dueDateInferred?: boolean;
      daysUntilDue: number;
      amount?: number;
      status?: 'paid' | 'partial' | 'unpaid';
    }> = [];

    for (const dueDate of dueDates) {
      if (dueDate < currentDate) continue;
      if (dueDate > futureDate) break;

      // Try to find a payment that specifically maps this dueDate (prefer period-indexed match)
      let matchedPayment: any = null;
      let matchedIndex: number | null = null;

      for (const p of payments) {
        if (p.duedate && Array.isArray(p.duedate) && p.duedate.length > 0) {
          const idx = p.duedate.findIndex((d: Date) => this.sameDay(new Date(d), dueDate));
          if (idx >= 0) {
            matchedPayment = p;
            matchedIndex = idx;
            break;
          }
        }
        // fallback: month/year match
        if (p.month === dueDate.getMonth() + 1 && p.year === dueDate.getFullYear()) {
          matchedPayment = p;
          matchedIndex = null;
          break;
        }
      }

      const paidForThisDue = matchedPayment ? (
        // If the matched payment specifies a period, require that its period points to this index
        (matchedPayment.period && matchedIndex !== null)
          ? (matchedPayment.period - 1 === matchedIndex && matchedPayment.status === 'paid')
          // otherwise, consider it paid only if its status is paid and paidAt or month/year aligns
          : (matchedPayment.status === 'paid' && ((matchedPayment.paidAt && this.sameDay(new Date(matchedPayment.paidAt), dueDate)) || (matchedPayment.month === dueDate.getMonth() + 1 && matchedPayment.year === dueDate.getFullYear())))
      ) : false;

      const partialOrUnpaid = matchedPayment && (matchedPayment.status === 'partial' || matchedPayment.status === 'unpaid') ? matchedPayment : undefined;

      if (!paidForThisDue) {
        const daysUntilDue = Math.floor(
          (dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        upcomingPayments.push({
          year: dueDate.getFullYear(),
          month: dueDate.getMonth() + 1,
          dueDate,
          duedate: matchedPayment?.duedate ?? undefined,
          period: matchedPayment?.period ?? undefined,
          dueDateInferred: !matchedPayment,
          daysUntilDue,
          amount: partialOrUnpaid?.amount,
          status: (partialOrUnpaid?.status as 'unpaid' | 'partial') || 'unpaid',
        });
      }
    }

    upcomingPayments.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    return upcomingPayments;
  }

  // Report generation
  async generateStudentAttendanceReport(studentId: string) {
    const student = await this.studentParticipantModel
      .findById(studentId)
      .populate('branchId', 'name slug')
      .lean()
      .exec();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const attendanceRecords = await this.studentAttendanceModel
      .find({ participantId: student._id })
      .populate('lessonId', 'title code order instrumentType')
      .populate('revisedLessonId', 'title code order instrumentType')
      .populate('recordedBy', 'firstName lastName email')
      .sort({ sessionDate: -1 })
      .lean()
      .exec();

    return {
      student: {
        fullName: student.fullName,
        attendanceNumber: student.attendanceNumber,
        instrumentType: student.instrumentType,
        registrationStartDate: student.registrationStartDate,
        branch: student.branchId,
        learningType: student.learningType,
        programDurationMonths: student.programDurationMonths,
      },
      attendanceRecords: attendanceRecords.map((record) => ({
        date: record.sessionDate,
        lesson: record.lessonId,
        revisedLesson: record.revisedLessonId,
        status: record.status,
        recordedBy: record.recordedBy,
      })),
      totalSessions: attendanceRecords.length,
      generatedAt: new Date(),
    };
  }

  async generateStudentPaymentReport(studentId: string) {
    const student = await this.studentParticipantModel
      .findById(studentId)
      .populate('branchId', 'name slug')
      .lean()
      .exec();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const payments = await this.studentPaymentModel
      .find({ participantId: student._id })
      .populate('recordedBy', 'firstName lastName email')
      .sort({ year: -1, month: -1 })
      .lean()
      .exec();

    const totalPaid = payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // If some payments do not have dueDate, attempt to infer from registrationStartDate + 30-day schedule
    const regDate = student.registrationStartDate ? new Date(student.registrationStartDate) : new Date();
    const regStartOfDay = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate());
    const candidateDueDates = this.getDueDatesFromRegistration(regStartOfDay, 36); // look ahead up to 36 months

    // Prepare paid-at ordered list for paidAt-based inference
    const paidPaymentsSorted = payments
      .filter((p) => p.paidAt)
      .sort((a, b) => {
        const at = a.paidAt ? new Date(a.paidAt as Date).getTime() : 0;
        const bt = b.paidAt ? new Date(b.paidAt as Date).getTime() : 0;
        return at - bt;
      });

    const paymentsWithDue = payments.map((payment) => {
      let inferredDue: Date | null = null;
      let dueDateInferred = false;

      // 0) If a duedate array is present on the record, prefer the entry for its period (or fallback to first)
      if (payment.duedate && Array.isArray(payment.duedate) && payment.duedate.length > 0) {
        if (payment.period && payment.period >= 1 && payment.period <= payment.duedate.length) {
          inferredDue = payment.duedate[payment.period - 1];
        } else {
          inferredDue = payment.duedate[0];
        }
        // persisted `duedate` array is canonical — not an inferred value
        dueDateInferred = false;
      }

      // 1) If dueDate is already recorded on the payment, prefer that — except when it equals paidAt (likely set to approval date)
      if (!inferredDue && payment.dueDate) {
        if (payment.paidAt && this.sameDay(payment.dueDate, new Date(payment.paidAt))) {
          // treat as missing and fall through to inference logic below
          // (this helps when dueDate was set to approval/paidAt and we want the scheduled due)
        } else {
          inferredDue = payment.dueDate;
          dueDateInferred = false;
        }
      }

      // 2) If we still don't have a due date, try month/year -> registration-derived schedule
      if (!inferredDue && payment.month && payment.year) {
        const match = candidateDueDates.find((d) => d.getFullYear() === payment.year && d.getMonth() + 1 === payment.month);
        if (match) {
          inferredDue = match;
          dueDateInferred = true;

        // 3) If still missing, but we have paidAt timestamps, infer from the earliest paidAt + 30-day multiples
        } else if (payment.paidAt) {
          const idx = paidPaymentsSorted.findIndex((pp) => String(pp._id) === String(payment._id));
          if (idx >= 0 && paidPaymentsSorted.length > 0) {
            if (paidPaymentsSorted.length > 0 && paidPaymentsSorted[0].paidAt) {
            const basePaidAt = new Date(paidPaymentsSorted[0].paidAt as Date);
            const inferred = new Date(basePaidAt);
            // Add 30 days per payment index (first paid = index 0 => base date, second = +30 days, etc.)
            inferred.setDate(inferred.getDate() + idx * 30);
            inferredDue = inferred;
            dueDateInferred = true;
          } else {
            inferredDue = null;
            dueDateInferred = false;
          }
          } else {
            inferredDue = null;
            dueDateInferred = false;
          }
        } else {
          inferredDue = null;
          dueDateInferred = false;
        }
      }

      // 4) No month/year and no match above - try paidAt series directly
      if (!inferredDue && payment.paidAt) {
        const idx = paidPaymentsSorted.findIndex((pp) => String(pp._id) === String(payment._id));
        if (idx >= 0 && paidPaymentsSorted.length > 0 && paidPaymentsSorted[0].paidAt) {
          const basePaidAt = new Date(paidPaymentsSorted[0].paidAt as Date);
          const inferred = new Date(basePaidAt);
          inferred.setDate(inferred.getDate() + idx * 30);
          inferredDue = inferred;
          dueDateInferred = true;
        } else {
          inferredDue = null;
          dueDateInferred = false;
        }
      }

      // 5) Nothing matched
      if (!inferredDue) {
        inferredDue = null;
        dueDateInferred = false;
      }
      return {
        month: payment.month,
        year: payment.year,
        amount: payment.amount,
        status: payment.status,
        dueDate: inferredDue ?? null,
        dueDateInferred,
        duedate: payment.duedate ?? undefined,
        period: payment.period ?? undefined,
        paidAt: payment.paidAt,
        note: payment.note,
        recordedBy: payment.recordedBy,
      };
    });

    return {
      student: {
        fullName: student.fullName,
        attendanceNumber: student.attendanceNumber,
        instrumentType: student.instrumentType,
        registrationStartDate: student.registrationStartDate,
        branch: student.branchId,
      },
      payments: paymentsWithDue,
      totalPaid,
      totalPayments: payments.length,
      paidCount: payments.filter((p) => p.status === 'paid').length,
      unpaidCount: payments.filter((p) => p.status === 'unpaid').length,
      generatedAt: new Date(),
    };
  }

  async generateTeacherAttendanceReport(teacherId: string, startDate?: Date, endDate?: Date) {
    const teacher = await this.teacherParticipantModel
      .findById(teacherId)
      .lean()
      .exec();

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const query: any = { participantId: teacher._id };
    if (startDate || endDate) {
      query.checkInAt = {};
      if (startDate) {
        query.checkInAt.$gte = startDate;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.checkInAt.$lte = end;
      }
    }

    const attendanceRecords = await this.teacherAttendanceModel
      .find(query)
      .populate('recordedBy', 'firstName lastName email')
      .sort({ checkInAt: -1 })
      .lean()
      .exec();

    const totalHours = attendanceRecords.reduce((sum, record) => {
      if (record.checkOutAt && record.durationMinutes) {
        return sum + record.durationMinutes / 60;
      }
      return sum;
    }, 0);

    return {
      teacher: {
        fullName: teacher.fullName,
        instruments: teacher.instruments,
        teachingDays: teacher.teachingDays,
      },
      attendanceRecords: attendanceRecords.map((record) => ({
        checkInAt: record.checkInAt,
        checkOutAt: record.checkOutAt,
        durationMinutes: record.durationMinutes,
        recordedBy: record.recordedBy,
      })),
      totalSessions: attendanceRecords.length,
      totalHours: Math.round(totalHours * 100) / 100,
      generatedAt: new Date(),
    };
  }
}
