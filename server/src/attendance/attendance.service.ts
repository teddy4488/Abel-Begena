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
  AttendanceStatus,
} from './schemas/student-attendance.schema';
import {
  InstrumentLesson,
  InstrumentLessonDocument,
} from './schemas/instrument-lesson.schema';
import {
  StudentPayment,
  StudentPaymentDocument,
} from './schemas/student-payment.schema';
import { ClosedDay, ClosedDayDocument } from './schemas/closed-day.schema';
import { Class, ClassDocument } from '../class/schemas/class.schema';
import { Enrollment, EnrollmentDocument } from '../enrollment/schemas/enrollment.schema';
import { RegisterTeacherParticipantDto } from './dto/register-teacher-participant.dto';
import { RegisterStudentParticipantDto } from './dto/register-student-participant.dto';
import { TeacherCheckInDto, TeacherCheckOutDto } from './dto/teacher-attendance.dto';
import { RecordStudentAttendanceDto } from './dto/record-student-attendance.dto';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notifications/notification.service';
import {
  WEEK_DAYS,
  WeekDay,
  toMinutes,
  toHHmm,
  isStartWithinHours,
  slotOverlapsBucket,
  DAY_START_MIN,
  DAY_END_MIN,
  BUCKET_MINUTES,
  SESSION_MINUTES,
} from '../class/class.constants';

type NormalizedSlot = { day: string; startTime: string };

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
    @InjectModel(Class.name)
    private readonly classModel: Model<ClassDocument>,
    @InjectModel(StudentPayment.name)
    private readonly studentPaymentModel: Model<StudentPaymentDocument>,
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(ClosedDay.name)
    private readonly closedDayModel: Model<ClosedDayDocument>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly notificationService: NotificationService,
  ) { }

  /** Local-midnight day window [start, nextDay) for a given date. */
  private dayWindow(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  /** Resolve the class/package a student is currently enrolled in (for denormalizing attendance). */
  private async resolveActiveClassId(
    userId?: Types.ObjectId,
  ): Promise<Types.ObjectId | undefined> {
    if (!userId) return undefined;
    const enr = await this.enrollmentModel
      .findOne({ studentId: userId, status: 'active' }, { classId: 1 })
      .lean()
      .exec();
    return (enr as { classId?: Types.ObjectId } | null)?.classId;
  }

  /** Best-effort in-app notification to a student that they were marked absent. */
  private async notifyStudentAbsent(
    participant: { userId?: Types.ObjectId; fullName?: string; missedLessonsCount?: number },
    sessionDate: Date,
    note?: string,
  ): Promise<void> {
    try {
      const userId = participant.userId?.toString();
      if (!userId) return;
      await this.notificationService.createForUser(userId, {
        type: 'attendance_absent',
        title: 'Marked absent',
        message: `You were marked absent for ${sessionDate.toLocaleDateString()}.${note ? ` Note: ${note}` : ''}`,
        data: { sessionDate: sessionDate.toISOString(), note },
      });
    } catch {
      // best-effort; never block attendance recording
    }
  }

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

  /**
   * Deactivate any attendance participants (teacher or student) linked to the given User id.
   * Used when a User is removed so they no longer appear in attendance lists.
   */
  async deactivateParticipantsForUser(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      return;
    }
    const objectId = new Types.ObjectId(userId);
    const now = new Date();

    await this.teacherParticipantModel
      .updateMany(
        { userId: objectId },
        { $set: { isActive: false } },
      )
      .exec();

    await this.studentParticipantModel
      .updateMany(
        { userId: objectId },
        { $set: { isActive: false, deletedAt: now } },
      )
      .exec();
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

  /**
   * Shared validation for student schedule input (used by convert, register, and update).
   * Enforces: correct day count for the program, no duplicate days, branch for physical,
   * and — when time slots are provided — valid in-hours times whose days match the chosen
   * learning days. Returns the normalized slots to persist.
   */
  private validateLearningSchedule(input: {
    programDurationMonths: 3 | 6 | 9;
    preferredLearningDays: string[];
    learningType?: 'physical' | 'online';
    branchId?: string;
    timeSlots?: { day: string; startTime: string }[];
  }): { timeSlots: NormalizedSlot[] } {
    const expectedDays = this.calculateLearningDaysPerWeek(
      input.programDurationMonths,
    );
    if (input.preferredLearningDays.length !== expectedDays) {
      throw new BadRequestException(
        `Program duration of ${input.programDurationMonths} months requires exactly ${expectedDays} learning days per week. Provided: ${input.preferredLearningDays.length}`,
      );
    }

    const uniqueDays = new Set(input.preferredLearningDays);
    if (uniqueDays.size !== input.preferredLearningDays.length) {
      throw new BadRequestException('Duplicate learning days are not allowed');
    }
    for (const d of input.preferredLearningDays) {
      if (!WEEK_DAYS.includes(d as WeekDay)) {
        throw new BadRequestException(`Invalid day: ${d}`);
      }
    }

    if (input.learningType === 'physical' && !input.branchId) {
      throw new BadRequestException('Branch is required for physical learning');
    }

    const slots = input.timeSlots ?? [];
    if (slots.length > 0) {
      if (slots.length !== expectedDays) {
        throw new BadRequestException(
          `Provide exactly ${expectedDays} session time(s) — one per learning day.`,
        );
      }
      const slotDays = new Set<string>();
      for (const slot of slots) {
        if (!WEEK_DAYS.includes(slot.day as WeekDay)) {
          throw new BadRequestException(`Invalid day: ${slot.day}`);
        }
        if (!uniqueDays.has(slot.day)) {
          throw new BadRequestException(
            `Time slot day ${slot.day} is not among the chosen learning days.`,
          );
        }
        if (slotDays.has(slot.day)) {
          throw new BadRequestException(
            `Duplicate time slot for ${slot.day}.`,
          );
        }
        slotDays.add(slot.day);
        const startMin = toMinutes(slot.startTime);
        if (Number.isNaN(startMin) || !isStartWithinHours(startMin)) {
          throw new BadRequestException(
            `Session time ${slot.startTime} must be between ${toHHmm(DAY_START_MIN)} and ${toHHmm(DAY_END_MIN - SESSION_MINUTES)}.`,
          );
        }
      }
    }

    return { timeSlots: slots.map((s) => ({ day: s.day, startTime: s.startTime })) };
  }

  /**
   * Syncs the User.studentProfile projection from a StudentAttendanceParticipant record.
   * StudentAttendanceParticipant is treated as the canonical operational student record.
   */
  private async syncUserStudentProfileFromParticipant(
    participantId: string | Types.ObjectId,
  ): Promise<void> {
    const participant = await this.studentParticipantModel
      .findById(participantId)
      .lean()
      .exec();
    if (!participant) {
      return;
    }
    const rawUserId = (participant as { userId?: Types.ObjectId | string }).userId;
    if (!rawUserId) {
      return;
    }
    const userId =
      typeof rawUserId === 'string' ? rawUserId : rawUserId.toString();

    const studentProfile: import('../user/dto/update-user.dto').UpdateUserDto['studentProfile'] =
      {
        attendanceNumber: (participant as { attendanceNumber: string }).attendanceNumber,
        fullName: (participant as { fullName: string }).fullName,
        branchId: (participant as { branchId?: Types.ObjectId }).branchId,
        learningType: (participant as { learningType?: 'physical' | 'online' }).learningType,
        instrumentType: (participant as { instrumentType?: string }).instrumentType,
        programDurationMonths: (participant as { programDurationMonths?: 3 | 6 | 9 }).programDurationMonths,
        preferredLearningDays: (participant as { preferredLearningDays?: string[] }).preferredLearningDays,
        registrationStartDate: (participant as { registrationStartDate?: Date }).registrationStartDate,
        learningDaysPerWeek: (participant as { learningDaysPerWeek?: number }).learningDaysPerWeek,
        isActive: (participant as { isActive?: boolean }).isActive ?? true,
        missedLessonsCount: (participant as { missedLessonsCount?: number }).missedLessonsCount ?? 0,
      };

    await this.userService.update(userId, {
      studentProfile,
    } as import('../user/dto/update-user.dto').UpdateUserDto);
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

    // Check if User with this email already exists
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    // Generate password for the User account
    const generatedPassword = this.generateRandomPassword();

    // Create User with role Teacher (auth handled via User collection)
    const nameParts = dto.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const createdUser = await this.userService.create({
      email,
      password: generatedPassword,
      firstName,
      lastName,
      role: 'Teacher',
      teacherStatus: 'approved',
      isVerified: true,
    });

    // Get the userId from the created User
    const userId = (createdUser as { _id: Types.ObjectId })._id;

    // Create attendance participant with userId reference (no auth fields)
    const created = await this.teacherParticipantModel.create({
      userId: new Types.ObjectId(userId),
      fullName: dto.fullName.trim(),
      instruments: dto.instruments,
      teachingDays: dto.teachingDays,
      timeRanges: dto.timeRanges,
      isActive: true,
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
      generatedPassword: process.env.NODE_ENV !== 'production' ? generatedPassword : undefined, // Only in dev
    };
  }

  async registerStudentParticipant(dto: RegisterStudentParticipantDto) {
    // Shared schedule validation (days/duration, duplicates, branch, time slots).
    const { timeSlots } = this.validateLearningSchedule({
      programDurationMonths: dto.programDurationMonths,
      preferredLearningDays: dto.preferredLearningDays,
      learningType: dto.learningType,
      branchId: dto.branchId,
      timeSlots: dto.timeSlots,
    });

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

    // Check if User with this email already exists
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    // Generate password for User account
    const generatedPassword = this.generateRandomPassword();

    // Create User with role Student (auth handled via User collection)
    const nameParts = dto.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const createdUser = await this.userService.create({
      email,
      password: generatedPassword,
      firstName,
      lastName,
      role: 'Student',
      isVerified: true,
      studentProfile: {
        attendanceNumber,
        fullName: dto.fullName.trim(),
        branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : undefined,
        learningType: dto.learningType,
        instrumentType: dto.instrumentType,
        programDurationMonths: dto.programDurationMonths,
        preferredLearningDays: dto.preferredLearningDays,
        registrationStartDate: new Date(dto.registrationStartDate),
        learningDaysPerWeek,
        isActive: true,
        missedLessonsCount: 0,
      },
    } as any);

    // Get the userId from the created User
    const userId = (createdUser as { _id: Types.ObjectId })._id;

    // Create attendance participant with userId reference (no auth fields)
    const created = await this.studentParticipantModel.create({
      userId: new Types.ObjectId(userId),
      fullName: dto.fullName.trim(),
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
      timeSlots,
      registrationStartDate: new Date(dto.registrationStartDate),
      learningDaysPerWeek,
      isActive: true,
      completionStatus: 'active',
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

    // Keep User.studentProfile in sync with the canonical participant record
    await this.syncUserStudentProfileFromParticipant(created._id);

    return {
      ...created.toObject(),
      generatedPassword:
        process.env.NODE_ENV !== 'production' ? generatedPassword : undefined, // Only in dev
    };
  }

  /**
   * Converts a User to a Student: updates User.role and User.studentProfile, and creates
   * StudentAttendanceParticipant. Callers (e.g. enrollment payment approval) should use the
   * returned student._id to record the first StudentPayment for minimal triple sync
   * (User + StudentAttendanceParticipant + first payment).
   */
  async convertUserToStudent(
    userId: string,
    dto: import('./dto/convert-user-to-student.dto').ConvertUserToStudentDto,
  ) {
    // Shared schedule validation (days/duration, duplicates, branch, time slots).
    const { timeSlots } = this.validateLearningSchedule({
      programDurationMonths: dto.programDurationMonths,
      preferredLearningDays: dto.preferredLearningDays,
      learningType: dto.learningType,
      branchId: dto.branchId,
      timeSlots: dto.timeSlots,
    });

    // Get user to migrate
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has an ACTIVE student participant record.
    // (Soft-deleted/reverted participants don't block a fresh conversion.)
    const existingStudent = await this.studentParticipantModel
      .findOne({ userId: new Types.ObjectId(userId), deletedAt: null })
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

    // Update User: set role Student (studentProfile will be synced from participant)
    await this.userService.update(userId, {
      role: 'Student',
    } as import('../user/dto/update-user.dto').UpdateUserDto);

    // Create attendance participant with userId reference (no auth fields).
    // Capture the agreed monthly fee from the payment amount (one month's tuition)
    // for expected-fee validation and consumption-based billing.
    const student = await this.studentParticipantModel.create({
      userId: new Types.ObjectId(userId),
      fullName: dto.fullName.trim(),
      attendanceNumber,
      branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : undefined,
      learningType: dto.learningType,
      instrumentType: dto.instrumentType,
      programDurationMonths: dto.programDurationMonths,
      preferredLearningDays: dto.preferredLearningDays,
      timeSlots,
      registrationStartDate: new Date(dto.registrationStartDate),
      learningDaysPerWeek,
      monthlyFee:
        typeof dto.amount === 'number' && dto.amount > 0 ? dto.amount : undefined,
      isActive: true,
      completionStatus: 'active',
    });

    // Sync User.studentProfile from the canonical participant record
    await this.syncUserStudentProfileFromParticipant(student._id);

    return {
      message: 'User converted to student successfully',
      student: student.toObject(),
    };
  }

  /**
   * Revert a student back to a regular user (admin-triggered only). The participant
   * is SOFT-deleted — its attendance and payment history is preserved and remains
   * browsable. The User keeps its studentProfile as a frozen historical snapshot.
   */
  async revertStudentToUser(
    userId: string,
    reason: 'completed' | 'withdrawn' | 'dropped',
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user id');
    }
    const participant = await this.studentParticipantModel
      .findOne({ userId: new Types.ObjectId(userId), deletedAt: null })
      .exec();
    if (!participant) {
      throw new NotFoundException('Active student record not found for this user');
    }

    const now = new Date();
    participant.isActive = false;
    participant.deletedAt = now;
    participant.completionStatus = reason;
    participant.completedAt = now;
    await participant.save();

    // Revert auth role to regular User. studentProfile is intentionally left in
    // place as a historical snapshot of who they were as a student.
    await this.userService.update(userId, {
      role: 'User',
    } as import('../user/dto/update-user.dto').UpdateUserDto);

    // Withdraw any still-active enrollments so the enrollment record reflects the exit
    // (records are preserved — status is just changed to withdrawn).
    await this.enrollmentModel
      .updateMany(
        { studentId: new Types.ObjectId(userId), status: { $ne: 'withdrawn' } },
        { status: 'withdrawn' },
      )
      .exec();

    return {
      message: 'Student reverted to user',
      reason,
      participantId: participant._id.toString(),
    };
  }

  /** Soft-deleted (reverted) students, for the admin "past students" history view. */
  async listPastStudents(branchFilter?: { branchId: string }) {
    const filter: Record<string, unknown> = { deletedAt: { $ne: null } };
    if (branchFilter?.branchId && Types.ObjectId.isValid(branchFilter.branchId)) {
      filter.branchId = new Types.ObjectId(branchFilter.branchId);
    }
    return this.studentParticipantModel
      .find(filter)
      .populate('branchId', 'name slug')
      .sort({ completedAt: -1 })
      .lean()
      .exec();
  }

  /**
   * Admin occupancy visualization. For a selected day, returns how many students
   * are in a session during each 30-min bucket across 08:00–19:30, computed from
   * **active student participants'** time slots (so both self-service and
   * admin-registered students are counted), accounting for the 1.5h session window.
   */
  async getDayOccupancy(params: {
    day: string;
    branchId?: string;
    instrumentType?: string;
  }) {
    const { day, branchId, instrumentType } = params;
    if (!WEEK_DAYS.includes(day as WeekDay)) {
      throw new BadRequestException('Invalid day');
    }

    const match: Record<string, unknown> = {
      isActive: true,
      deletedAt: null,
      'timeSlots.day': day,
    };
    if (branchId && Types.ObjectId.isValid(branchId)) {
      match.branchId = new Types.ObjectId(branchId);
    }
    if (instrumentType) {
      match.instrumentType = instrumentType;
    }

    const participants = await this.studentParticipantModel
      .find(match, { userId: 1, timeSlots: 1 })
      .lean()
      .exec();

    const slots: { studentId: string; startTime: string }[] = [];
    for (const p of participants) {
      const ts =
        (p as { timeSlots?: { day: string; startTime: string }[] }).timeSlots ??
        [];
      const sid =
        (p as { userId?: Types.ObjectId }).userId?.toString() ??
        (p as { _id: Types.ObjectId })._id.toString();
      for (const s of ts) {
        if (s.day === day && s.startTime) {
          slots.push({ studentId: sid, startTime: s.startTime });
        }
      }
    }

    const buckets: { time: string; count: number }[] = [];
    for (
      let b = DAY_START_MIN;
      b <= DAY_END_MIN - BUCKET_MINUTES;
      b += BUCKET_MINUTES
    ) {
      let count = 0;
      for (const s of slots) {
        const m = toMinutes(s.startTime);
        if (!Number.isNaN(m) && slotOverlapsBucket(m, b)) count += 1;
      }
      buckets.push({ time: toHHmm(b), count });
    }

    const bySlotMap = new Map<string, number>();
    const distinct = new Set<string>();
    for (const s of slots) {
      bySlotMap.set(s.startTime, (bySlotMap.get(s.startTime) ?? 0) + 1);
      distinct.add(s.studentId);
    }
    const bySlot = Array.from(bySlotMap.entries())
      .map(([startTime, count]) => ({ startTime, count }))
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    return {
      day,
      operatingHours: { start: toHHmm(DAY_START_MIN), end: toHHmm(DAY_END_MIN) },
      sessionMinutes: SESSION_MINUTES,
      buckets,
      bySlot,
      totalStudents: distinct.size,
      totalSessions: slots.length,
    };
  }

  async listTeacherParticipants() {
    return this.teacherParticipantModel
      .find({ isActive: true })
      .sort({ fullName: 1 })
      .lean()
      .exec();
  }

  /** Phase 5.3: optional branchFilter scopes to branch (Admin with branchId). */
  async listStudentParticipants(branchFilter?: { branchId: string }) {
    const filter: Record<string, unknown> = { isActive: true, deletedAt: null };
    if (branchFilter?.branchId && Types.ObjectId.isValid(branchFilter.branchId)) {
      filter.branchId = new Types.ObjectId(branchFilter.branchId);
    }
    return this.studentParticipantModel
      .find(filter)
      .populate('branchId', 'name slug')
      .sort({ fullName: 1 })
      .lean()
      .exec();
  }

  async getStudentByAttendanceNumber(attendanceNumber: string) {
    const student = await this.studentParticipantModel
      .findOne({
        attendanceNumber: attendanceNumber.trim(),
        isActive: true,
        deletedAt: null,
      })
      .populate('branchId', 'name slug')
      .lean()
      .exec();

    if (!student) {
      throw new NotFoundException('Student not found with this attendance number');
    }

    return student;
  }

  /** Phase 5.3: optional branchFilter scopes to branch (Admin with branchId). */
  async searchStudents(query: string, branchFilter?: { branchId: string }) {
    const searchTerm = query.trim();
    if (!searchTerm || searchTerm.length < 1) {
      return [];
    }

    const escapeRegExp = (value: string) =>
      value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safe = escapeRegExp(searchTerm);
    const filter: Record<string, unknown> = {
      isActive: true,
      deletedAt: null,
      $or: [
        { attendanceNumber: { $regex: safe, $options: 'i' } },
        { fullName: { $regex: safe, $options: 'i' } },
      ],
    };
    if (branchFilter?.branchId && Types.ObjectId.isValid(branchFilter.branchId)) {
      filter.branchId = new Types.ObjectId(branchFilter.branchId);
    }
    const students = await this.studentParticipantModel
      .find(filter)
      .populate('branchId', 'name slug')
      .sort({ fullName: 1 })
      .limit(20)
      .lean()
      .exec();

    return students;
  }

  async getStudentDetails(studentId: string): Promise<unknown> {
    const student = await this.studentParticipantModel
      .findOne({ _id: studentId, deletedAt: null })
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
    const student = await this.studentParticipantModel
      .findOne({ _id: id, deletedAt: null })
      .exec();
    if (!student) {
      throw new NotFoundException('Student participant not found');
    }

    Object.assign(student, updateData);
    await student.save();

    // Keep User.studentProfile in sync with the canonical participant record
    await this.syncUserStudentProfileFromParticipant(student._id);

    return this.studentParticipantModel
      .findOne({ _id: id, deletedAt: null })
      .populate('branchId', 'name slug')
      .lean()
      .exec();
  }

  /**
   * Computes the list of students expected to attend on a given date based on:
   * - Active enrollments
   * - Active student participants
   * - Preferred learning days
   */
  async getExpectedStudentsForDate(date: Date) {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const dayOfWeekIndex = target.getDay(); // 0 = Sunday
    const dayNames: string[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayName = dayNames[dayOfWeekIndex];

    // Find all active enrollments
    const activeEnrollments = await this.enrollmentModel
      .find({ status: 'active' })
      .select('classId studentId')
      .lean()
      .exec();

    if (!activeEnrollments.length) {
      return [];
    }

    const userIds = Array.from(
      new Set(
        activeEnrollments
          .map((e) => (e.studentId as Types.ObjectId)?.toString?.())
          .filter((id): id is string => !!id),
      ),
    );

    if (!userIds.length) {
      return [];
    }

    const participants = await this.studentParticipantModel
      .find({
        userId: { $in: userIds.map((id) => new Types.ObjectId(id)) },
        isActive: true,
        deletedAt: null,
        preferredLearningDays: dayName,
      })
      .select('_id userId branchId preferredLearningDays')
      .lean()
      .exec();

    const participantsByUserId = new Map<string, (typeof participants)[number]>();
    for (const p of participants) {
      const uid = (p.userId as Types.ObjectId)?.toString?.() ?? '';
      if (uid) {
        participantsByUserId.set(uid, p);
      }
    }

    const expected: Array<{
      participantId: string;
      userId: string;
      classId: string;
      date: string;
    }> = [];

    for (const enrollment of activeEnrollments) {
      const studentId =
        (enrollment.studentId as Types.ObjectId)?.toString?.() ?? '';
      const participant = participantsByUserId.get(studentId);
      if (!participant) continue;
      const classId =
        (enrollment.classId as Types.ObjectId)?.toString?.() ?? '';
      if (!classId) continue;

      expected.push({
        participantId: (participant._id as Types.ObjectId).toString(),
        userId: studentId,
        classId,
        date: target.toISOString().split('T')[0],
      });
    }

    return expected;
  }

  /**
   * Computes per-lesson progress for a student in a given class based on attendance.
   * Returns total/completed counts and per-lesson completion flags.
   */
  async getLessonProgressForStudentInClass(userId: string, classId: string) {
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid classId');
    }

    // Resolve the student participant for this user
    const participant = await this.studentParticipantModel
      .findOne({
        userId: new Types.ObjectId(userId),
        isActive: true,
        deletedAt: null,
      })
      .lean()
      .exec();

    if (!participant) {
      throw new NotFoundException('Student participant not found for this user');
    }

    // Load all active lessons for the class
    const lessons = await this.lessonModel
      .find({
        classId: new Types.ObjectId(classId),
        isActive: true,
      })
      .sort({ order: 1 })
      .lean()
      .exec();

    if (!lessons.length) {
      return {
        totalLessons: 0,
        completedLessons: 0,
        percentage: 0,
        lessons: [],
      };
    }

    const lessonIds = lessons.map((l) => l._id);

    // Find attendance records where the student was present/late for lessons in this class
    const attendanceRecords = await this.studentAttendanceModel
      .find({
        participantId: new Types.ObjectId(participant._id),
        lessonId: { $in: lessonIds },
        status: { $in: ['present', 'late'] },
      })
      .lean()
      .exec();

    const attendanceByLesson = new Map<
      string,
      { lastAttendedAt: Date | null }
    >();

    for (const rec of attendanceRecords) {
      const lessonId = (rec.lessonId as Types.ObjectId).toString();
      const current = attendanceByLesson.get(lessonId);
      const sessionDate = rec.sessionDate as Date | undefined;
      if (!current) {
        attendanceByLesson.set(lessonId, {
          lastAttendedAt: sessionDate ?? null,
        });
      } else if (
        sessionDate &&
        (!current.lastAttendedAt ||
          new Date(sessionDate) > new Date(current.lastAttendedAt))
      ) {
        current.lastAttendedAt = sessionDate;
      }
    }

    let completedLessons = 0;
    const lessonProgress = lessons.map((lesson) => {
      const info = attendanceByLesson.get(lesson._id.toString());
      const isCompleted = !!info;
      if (isCompleted) {
        completedLessons += 1;
      }
      return {
        _id: lesson._id.toString(),
        title: lesson.title,
        code: lesson.code,
        order: lesson.order,
        isCompleted,
        lastAttendedAt: info?.lastAttendedAt ?? null,
      };
    });

    const totalLessons = lessons.length;
    const percentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      totalLessons,
      completedLessons,
      percentage,
      lessons: lessonProgress,
    };
  }

  async removeStudentParticipant(id: string) {
    const updated = await this.studentParticipantModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { isActive: false, deletedAt: new Date() },
        { new: true },
      )
      .lean()
      .exec();
    if (!updated) {
      throw new NotFoundException('Student participant not found');
    }
    return { message: 'Student removed' };
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
      sessionDate: today,
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

    const status = dto.status || 'present';

    // Resolve session date (default: now). Backfill allowed; reject future days.
    const sessionDate = dto.sessionDate ? new Date(dto.sessionDate) : new Date();
    if (Number.isNaN(sessionDate.getTime())) {
      throw new BadRequestException('Invalid session date');
    }
    const { start: dayStart } = this.dayWindow(sessionDate);
    const { start: todayStart } = this.dayWindow(new Date());
    if (dayStart.getTime() > todayStart.getTime()) {
      throw new BadRequestException('Cannot record attendance for a future date');
    }

    // Lesson is required for present/late; optional for excused/absent.
    let lessonId: Types.ObjectId | undefined;
    let lessonClassId: Types.ObjectId | undefined;
    if (status === 'present' || status === 'late') {
      if (!dto.lessonId) {
        throw new BadRequestException('A lesson is required when marking present or late');
      }
    }
    if (dto.lessonId) {
      const lesson = await this.lessonModel
        .findOne({
          _id: new Types.ObjectId(dto.lessonId),
          instrumentType: participant.instrumentType,
          isActive: true,
        })
        .lean()
        .exec();
      if (!lesson) {
        throw new BadRequestException('Lesson not found for the student instrument');
      }
      lessonId = new Types.ObjectId(dto.lessonId);
      lessonClassId = (lesson as { classId?: Types.ObjectId }).classId;
    }

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
        throw new BadRequestException('Revised lesson not found for the student instrument');
      }
      revisedLessonId = new Types.ObjectId(dto.revisedLessonId);
    }

    const classId =
      lessonClassId ?? (await this.resolveActiveClassId(participant.userId));

    // Upsert by (participant, day): a new record, or override an existing one
    // (e.g. a previously approved absence becomes a present).
    const existing = await this.studentAttendanceModel
      .findOne({
        participantId: participant._id,
        sessionDate: { $gte: dayStart, $lt: this.dayWindow(sessionDate).end },
      })
      .exec();

    const wasAbsent = existing?.status === 'absent';
    const willBeAbsent = status === 'absent';

    let record: StudentAttendanceDocument;
    if (existing) {
      existing.status = status;
      existing.lessonId = lessonId;
      existing.revisedLessonId = revisedLessonId;
      existing.classId = classId;
      existing.note = dto.note;
      existing.recordedBy = new Types.ObjectId(adminUserId);
      existing.userId = participant.userId;
      existing.attendanceNumber = participant.attendanceNumber;
      existing.studentName = participant.fullName;
      await existing.save();
      record = existing;
    } else {
      record = await this.studentAttendanceModel.create({
        participantId: participant._id,
        userId: participant.userId,
        attendanceNumber: participant.attendanceNumber,
        studentName: participant.fullName,
        classId,
        sessionDate,
        lessonId,
        revisedLessonId,
        status,
        note: dto.note,
        recordedBy: new Types.ObjectId(adminUserId),
      });
    }

    // Keep missedLessonsCount consistent across transitions.
    if (!wasAbsent && willBeAbsent) {
      await this.studentParticipantModel
        .updateOne({ _id: participant._id }, { $inc: { missedLessonsCount: 1 } })
        .exec();
      await this.notifyStudentAbsent(participant, sessionDate, dto.note);
    } else if (wasAbsent && !willBeAbsent) {
      await this.studentParticipantModel
        .updateOne(
          { _id: participant._id, missedLessonsCount: { $gt: 0 } },
          { $inc: { missedLessonsCount: -1 } },
        )
        .exec();
    }

    return record.toObject();
  }

  /** Edit an existing attendance record (status/lesson/note). Keeps missedLessonsCount correct. */
  async updateAttendanceRecord(
    recordId: string,
    dto: { status?: AttendanceStatus; lessonId?: string; note?: string },
  ) {
    if (!Types.ObjectId.isValid(recordId)) {
      throw new BadRequestException('Invalid record id');
    }
    const record = await this.studentAttendanceModel.findById(recordId).exec();
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }
    const wasAbsent = record.status === 'absent';

    if (dto.status) {
      if ((dto.status === 'present' || dto.status === 'late') && !dto.lessonId && !record.lessonId) {
        throw new BadRequestException('A lesson is required when marking present or late');
      }
      record.status = dto.status;
    }
    if (dto.lessonId) {
      const participant = await this.studentParticipantModel
        .findById(record.participantId)
        .lean()
        .exec();
      const lesson = await this.lessonModel
        .findOne({
          _id: new Types.ObjectId(dto.lessonId),
          instrumentType: (participant as { instrumentType?: string } | null)?.instrumentType,
          isActive: true,
        })
        .lean()
        .exec();
      if (!lesson) {
        throw new BadRequestException('Lesson not found for the student instrument');
      }
      record.lessonId = new Types.ObjectId(dto.lessonId);
      record.classId = (lesson as { classId?: Types.ObjectId }).classId ?? record.classId;
    }
    if (dto.note !== undefined) {
      record.note = dto.note;
    }
    await record.save();

    const isAbsent = record.status === 'absent';
    if (!wasAbsent && isAbsent) {
      await this.studentParticipantModel
        .updateOne({ _id: record.participantId }, { $inc: { missedLessonsCount: 1 } })
        .exec();
    } else if (wasAbsent && !isAbsent) {
      await this.studentParticipantModel
        .updateOne(
          { _id: record.participantId, missedLessonsCount: { $gt: 0 } },
          { $inc: { missedLessonsCount: -1 } },
        )
        .exec();
    }
    return record.toObject();
  }

  /** Delete an attendance record (e.g. recorded by mistake). Decrements missed count if it was absent. */
  async deleteAttendanceRecord(recordId: string) {
    if (!Types.ObjectId.isValid(recordId)) {
      throw new BadRequestException('Invalid record id');
    }
    const record = await this.studentAttendanceModel.findById(recordId).exec();
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }
    if (record.status === 'absent') {
      await this.studentParticipantModel
        .updateOne(
          { _id: record.participantId, missedLessonsCount: { $gt: 0 } },
          { $inc: { missedLessonsCount: -1 } },
        )
        .exec();
    }
    await record.deleteOne();
    return { message: 'Attendance record deleted' };
  }

  // ---- Closed days -------------------------------------------------------

  /** True if the school is closed on `date` (global closure or one for `branchId`). */
  async isClosed(date: Date, branchId?: string): Promise<boolean> {
    const { start, end } = this.dayWindow(date);
    const branchClause: Record<string, unknown>[] = [{ branchId: null }];
    if (branchId && Types.ObjectId.isValid(branchId)) {
      branchClause.push({ branchId: new Types.ObjectId(branchId) });
    }
    const closed = await this.closedDayModel
      .findOne({ date: { $gte: start, $lt: end }, $or: branchClause })
      .lean()
      .exec();
    return !!closed;
  }

  async listClosedDays(branchFilter?: { branchId: string }) {
    const filter: Record<string, unknown> = {};
    if (branchFilter?.branchId && Types.ObjectId.isValid(branchFilter.branchId)) {
      filter.$or = [{ branchId: null }, { branchId: new Types.ObjectId(branchFilter.branchId) }];
    }
    return this.closedDayModel
      .find(filter)
      .populate('branchId', 'name')
      .sort({ date: -1 })
      .lean()
      .exec();
  }

  async createClosedDay(input: { date: string; branchId?: string; reason?: string }, adminId: string) {
    const date = new Date(input.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const { start } = this.dayWindow(date);
    const created = await this.closedDayModel.create({
      date: start,
      branchId:
        input.branchId && Types.ObjectId.isValid(input.branchId)
          ? new Types.ObjectId(input.branchId)
          : undefined,
      reason: input.reason,
      createdBy: new Types.ObjectId(adminId),
    });
    return created.toObject();
  }

  async deleteClosedDay(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }
    const removed = await this.closedDayModel.findByIdAndDelete(id).lean().exec();
    if (!removed) {
      throw new NotFoundException('Closed day not found');
    }
    return { message: 'Closed day removed' };
  }

  // ---- No-show review ----------------------------------------------------

  /** Active participants scheduled on the given date's weekday (branch-scoped). */
  private async getExpectedParticipantsForDate(
    date: Date,
    branchId?: string,
  ) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[new Date(date).getDay()];
    const filter: Record<string, unknown> = {
      isActive: true,
      deletedAt: null,
      preferredLearningDays: dayName,
    };
    if (branchId && Types.ObjectId.isValid(branchId)) {
      filter.branchId = new Types.ObjectId(branchId);
    }
    return this.studentParticipantModel
      .find(filter, {
        _id: 1,
        userId: 1,
        fullName: 1,
        attendanceNumber: 1,
        instrumentType: 1,
        branchId: 1,
      })
      .sort({ fullName: 1 })
      .lean()
      .exec();
  }

  /** Expected-but-unmarked students for a date — the no-show list for admin review. */
  async getNoShowsForDate(dateStr: string, branchId?: string) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    if (await this.isClosed(date, branchId)) {
      return { date: dateStr, closed: true, noShows: [] };
    }

    const expected = await this.getExpectedParticipantsForDate(date, branchId);
    if (!expected.length) {
      return { date: dateStr, closed: false, noShows: [] };
    }

    const { start, end } = this.dayWindow(date);
    const recorded = await this.studentAttendanceModel
      .find(
        {
          participantId: { $in: expected.map((p) => p._id) },
          sessionDate: { $gte: start, $lt: end },
        },
        { participantId: 1 },
      )
      .lean()
      .exec();
    const recordedSet = new Set(recorded.map((r) => r.participantId.toString()));

    const noShows = expected
      .filter((p) => !recordedSet.has((p._id as Types.ObjectId).toString()))
      .map((p) => ({
        participantId: (p._id as Types.ObjectId).toString(),
        userId: (p.userId as Types.ObjectId | undefined)?.toString() ?? null,
        fullName: p.fullName,
        attendanceNumber: p.attendanceNumber,
        instrumentType: p.instrumentType,
      }));

    return { date: dateStr, closed: false, noShows };
  }

  /** Approve no-shows as absent (bulk). Skips students who already have a record that day. */
  async markNoShowsAbsent(
    dateStr: string,
    participantIds: string[],
    adminId: string,
  ) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const { start, end } = this.dayWindow(date);
    let marked = 0;
    for (const pid of participantIds) {
      if (!Types.ObjectId.isValid(pid)) continue;
      const participant = await this.studentParticipantModel.findById(pid).exec();
      if (!participant || !participant.isActive) continue;
      const existing = await this.studentAttendanceModel
        .findOne({ participantId: participant._id, sessionDate: { $gte: start, $lt: end } })
        .lean()
        .exec();
      if (existing) continue; // already has a record that day — don't override
      const classId = await this.resolveActiveClassId(participant.userId);
      await this.studentAttendanceModel.create({
        participantId: participant._id,
        userId: participant.userId,
        attendanceNumber: participant.attendanceNumber,
        studentName: participant.fullName,
        classId,
        sessionDate: start,
        status: 'absent',
        recordedBy: new Types.ObjectId(adminId),
      });
      await this.studentParticipantModel
        .updateOne({ _id: participant._id }, { $inc: { missedLessonsCount: 1 } })
        .exec();
      await this.notifyStudentAbsent(participant, start);
      marked += 1;
    }
    return { marked };
  }

  /** Revert (remove) absences for the given participants on a date (bulk). */
  async revertNoShows(dateStr: string, participantIds: string[]) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const { start, end } = this.dayWindow(date);
    let reverted = 0;
    for (const pid of participantIds) {
      if (!Types.ObjectId.isValid(pid)) continue;
      const record = await this.studentAttendanceModel
        .findOne({
          participantId: new Types.ObjectId(pid),
          sessionDate: { $gte: start, $lt: end },
          status: 'absent',
        })
        .exec();
      if (!record) continue;
      await record.deleteOne();
      await this.studentParticipantModel
        .updateOne(
          { _id: new Types.ObjectId(pid), missedLessonsCount: { $gt: 0 } },
          { $inc: { missedLessonsCount: -1 } },
        )
        .exec();
      reverted += 1;
    }
    return { reverted };
  }

  // ---- Reporting ---------------------------------------------------------

  /** Attendance summary (counts + rate %) for a student, by their user id. */
  async getStudentAttendanceSummary(userId: string) {
    const participant = await this.studentParticipantModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();
    if (!participant) {
      throw new NotFoundException('Student participant not found');
    }
    const records = await this.studentAttendanceModel
      .find({ participantId: participant._id }, { status: 1 })
      .lean()
      .exec();
    const counts = { present: 0, late: 0, excused: 0, absent: 0 };
    for (const r of records) {
      const s = r.status as keyof typeof counts;
      if (s in counts) counts[s] += 1;
    }
    const total = records.length;
    const attended = counts.present + counts.late;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { total, ...counts, attendanceRate: rate };
  }

  /** CSV of attendance records for the given filters (admin records/export). */
  async exportAttendanceCsv(filters: {
    from?: string;
    to?: string;
    branchId?: string;
    participantId?: string;
  }): Promise<string> {
    const query: Record<string, unknown> = {};
    if (filters.participantId && Types.ObjectId.isValid(filters.participantId)) {
      query.participantId = new Types.ObjectId(filters.participantId);
    }
    if (filters.from || filters.to) {
      const range: Record<string, Date> = {};
      if (filters.from) range.$gte = this.dayWindow(new Date(filters.from)).start;
      if (filters.to) range.$lt = this.dayWindow(new Date(filters.to)).end;
      query.sessionDate = range;
    }
    if (filters.branchId && Types.ObjectId.isValid(filters.branchId)) {
      const branchParticipants = await this.studentParticipantModel
        .find({ branchId: new Types.ObjectId(filters.branchId) }, { _id: 1 })
        .lean()
        .exec();
      query.participantId = { $in: branchParticipants.map((p) => p._id) };
    }

    const records = await this.studentAttendanceModel
      .find(query)
      .populate('lessonId', 'title code')
      .sort({ sessionDate: -1 })
      .limit(10000)
      .lean()
      .exec();

    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const header = 'date,attendanceNumber,studentName,status,lesson,note';
    const rows = records.map((r) => {
      const lesson = r.lessonId as { title?: string } | null;
      return [
        (r.sessionDate as Date)?.toISOString?.().slice(0, 10) ?? '',
        esc(r.attendanceNumber),
        esc(r.studentName),
        esc(r.status),
        esc(lesson?.title ?? ''),
        esc((r as { note?: string }).note ?? ''),
      ].join(',');
    });
    return [header, ...rows].join('\n');
  }

  async getStudentAttendanceRecords(studentId: string) {
    // studentId is the User's _id, so lookup participant by userId field
    const participant = await this.studentParticipantModel.findOne({ userId: new Types.ObjectId(studentId) }).exec();
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

  /**
   * True if a recorded payment row is overdue: not settled (unpaid) AND its billing
   * period has already been consumed. Advance/future periods are never overdue.
   */
  private isPaymentOverdue(
    p: { status: string; period?: number },
    periodsConsumedEff: number,
  ): boolean {
    if (p.status === 'paid' || p.status === 'waived') return false;
    if (typeof p.period === 'number') return p.period <= periodsConsumedEff;
    return true; // legacy row without a period: treat an unpaid row as overdue
  }

  async getStudentPayments(studentId: string): Promise<unknown> {
    // studentId is the User's _id, so lookup participant by userId field
    const participant = await this.studentParticipantModel
      .findOne({ userId: new Types.ObjectId(studentId) })
      .lean()
      .exec();
    if (!participant) {
      throw new NotFoundException('Student participant not found');
    }

    const state = await this.computeBillingState(participant);
    const payments = await this.studentPaymentModel
      .find({ participantId: participant._id })
      .sort({ period: 1, year: -1, month: -1 })
      .lean()
      .exec();

    return payments.map((p) => ({
      ...p,
      isOverdue: this.isPaymentOverdue(p, state.periodsConsumedEff),
    }));
  }

  /** Map of userId → agreed monthly fee for active participants (for expected-fee surfacing). */
  async getMonthlyFeesByUserIds(userIds: string[]): Promise<Map<string, number>> {
    const ids = userIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    const map = new Map<string, number>();
    if (!ids.length) return map;
    const parts = await this.studentParticipantModel
      .find({ userId: { $in: ids }, deletedAt: null })
      .select('userId monthlyFee')
      .lean()
      .exec();
    for (const p of parts) {
      if (typeof p.monthlyFee === 'number') {
        map.set(String((p as { userId?: Types.ObjectId }).userId), p.monthlyFee);
      }
    }
    return map;
  }

  /** Resolve student participant id by user id (for payment approval etc.). Returns null if not found. */
  async getParticipantIdByUserId(userId: string): Promise<string | null> {
    const participant = await this.studentParticipantModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .select('_id')
      .lean()
      .exec();
    return participant ? participant._id.toString() : null;
  }

  /** Resolve teacher participant id by user id (for reports etc.). Returns null if not found. */
  async getTeacherParticipantIdByUserId(userId: string): Promise<string | null> {
    const participant = await this.teacherParticipantModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .select('_id')
      .lean()
      .exec();
    return participant ? participant._id.toString() : null;
  }

  async listInstrumentLessons(classId?: string) {
    const filter: any = { isActive: true };
    if (classId) {
      if (!Types.ObjectId.isValid(classId)) {
        throw new BadRequestException('Invalid classId');
      }
      filter.classId = new Types.ObjectId(classId);
    }
    return this.lessonModel
      .find(filter)
      .sort({ order: 1, title: 1 })
      .lean()
      .exec();
  }

  // Lessons management
  async createLesson(data: {
    classId: string;
    title: string;
    code?: string;
    order?: number;
  }) {
    if (!Types.ObjectId.isValid(data.classId)) {
      throw new BadRequestException('Invalid classId');
    }

    const klass = await this.classModel.findById(data.classId).lean().exec();
    if (!klass) {
      throw new NotFoundException('Class not found');
    }

    const created = await this.lessonModel.create({
      classId: new Types.ObjectId(data.classId),
      instrumentType: (klass as any).instrumentType,
      level: (klass as any).level ?? 'beginner',
      title: data.title.trim(),
      code: data.code?.trim(),
      order: data.order ?? 0,
      isActive: true,
    });
    return created.toObject();
  }

  async updateLesson(lessonId: string, data: {
    classId?: string;
    title?: string;
    code?: string;
    order?: number;
    isActive?: boolean;
  }) {
    const lesson = await this.lessonModel.findById(lessonId).exec();
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (data.classId) {
      if (!Types.ObjectId.isValid(data.classId)) {
        throw new BadRequestException('Invalid classId');
      }
      const klass = await this.classModel.findById(data.classId).lean().exec();
      if (!klass) {
        throw new NotFoundException('Class not found');
      }
      lesson.classId = new Types.ObjectId(data.classId);
      (lesson as any).instrumentType = (klass as any).instrumentType;
      (lesson as any).level = (klass as any).level ?? 'beginner';
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

    // Aggregate payments (count months with status paid)
    const paymentsAgg = await this.studentPaymentModel
      .aggregate([
        {
          $match: {
            participantId: { $in: participantIds },
            status: 'paid',
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

  // Billing / payments — CONSUMPTION-BASED, admin-decided.
  // A billing period is an active ~30-day window: attending at all in a window owes
  // one full fee; windows with no attendance are skipped (the pause). Nothing here
  // auto-charges — the computed state is advisory for the desk admin.
  private getCurrentYearMonth() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  private addDays(date: Date, days: number): Date {
    const out = new Date(date);
    out.setDate(out.getDate() + days);
    return out;
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /** Length of one billing window in days (configurable; default 30). */
  private getPeriodDays(): number {
    const v = parseInt(process.env.PAYMENT_PERIOD_DAYS ?? '', 10);
    return Number.isFinite(v) && v > 0 ? v : 30;
  }

  /** Weeks per month for the display-only "attended X of ~Y" hint (default 4). */
  private getWeeksPerMonth(): number {
    const v = parseFloat(process.env.PAYMENT_WEEKS_PER_MONTH ?? '');
    return Number.isFinite(v) && v > 0 ? v : 4;
  }

  /**
   * Core billing model. Walks the student's attended (present/late) sessions and opens
   * a new billing period at each session that lands at/after the current window's end.
   * Empty windows (long no-shows) create no period and are never billed. Everything is
   * advisory; `suggestedOwed`/`overdue` are indicators the admin acts on at discretion.
   */
  private async computeBillingState(participant: {
    _id: Types.ObjectId | string;
    registrationStartDate?: Date;
    programDurationMonths?: number;
    learningDaysPerWeek?: number;
    periodAdjustment?: number;
    monthlyFee?: number;
  }) {
    const periodDays = this.getPeriodDays();
    const participantId = new Types.ObjectId(String(participant._id));
    const regDate = this.startOfDay(
      participant.registrationStartDate
        ? new Date(participant.registrationStartDate)
        : new Date(),
    );

    const sessions = await this.studentAttendanceModel
      .find({ participantId, status: { $in: ['present', 'late'] } })
      .select('sessionDate')
      .sort({ sessionDate: 1 })
      .lean()
      .exec();

    // Window-start date for each consumed period (index 0 = period 1).
    const periodStarts: Date[] = [];
    let windowEnd = regDate;
    let currentWindowAttended = 0;
    for (const s of sessions) {
      const d = this.startOfDay(new Date(s.sessionDate as Date));
      if (d.getTime() >= windowEnd.getTime()) {
        periodStarts.push(d);
        windowEnd = this.addDays(d, periodDays);
        currentWindowAttended = 1;
      } else {
        currentWindowAttended += 1;
      }
    }
    const periodsConsumed = periodStarts.length;

    const duration = participant.programDurationMonths ?? 0;
    const maxBillable = duration > 0 ? Math.ceil(duration * 1.5) : periodsConsumed;
    const adjustment = participant.periodAdjustment ?? 0;
    const periodsConsumedEff = Math.max(
      0,
      Math.min(periodsConsumed + adjustment, maxBillable || periodsConsumed + adjustment),
    );

    const payments = await this.studentPaymentModel
      .find({ participantId })
      .sort({ period: 1 })
      .lean()
      .exec();
    const settledPeriodSet = new Set<number>();
    for (const p of payments) {
      if (
        (p.status === 'paid' || p.status === 'waived') &&
        typeof p.period === 'number'
      ) {
        settledPeriodSet.add(p.period);
      }
    }
    const periodsSettled = settledPeriodSet.size;
    const suggestedOwed = Math.max(0, periodsConsumedEff - periodsSettled);

    let nextDuePeriod = 1;
    while (settledPeriodSet.has(nextDuePeriod)) nextDuePeriod += 1;

    const expectedSessionsPerPeriod = Math.max(
      1,
      Math.round((participant.learningDaysPerWeek ?? 0) * this.getWeeksPerMonth()),
    );

    return {
      periodDays,
      registrationStartDate: regDate,
      periodStarts,
      periodsConsumed,
      periodsConsumedEff,
      periodsSettled,
      settledPeriods: [...settledPeriodSet].sort((a, b) => a - b),
      suggestedOwed,
      overdue: suggestedOwed > 0,
      maxBillable,
      windowExceeded: periodsConsumed > maxBillable,
      expectedSessionsPerPeriod,
      currentWindowAttended: periodsConsumed > 0 ? currentWindowAttended : 0,
      monthlyFee: participant.monthlyFee,
      nextDuePeriod,
      payments,
    };
  }

  /** Window-start date for a given 1-based period (for display/metadata). */
  private periodWindowStart(
    state: { periodStarts: Date[]; registrationStartDate: Date; periodDays: number },
    period: number,
  ): Date {
    if (period >= 1 && period <= state.periodStarts.length) {
      return new Date(state.periodStarts[period - 1]);
    }
    // Period not yet consumed (e.g. an advance payment): project forward from the
    // last known window-start (or registration) by whole period lengths.
    const base =
      state.periodStarts.length > 0
        ? state.periodStarts[state.periodStarts.length - 1]
        : state.registrationStartDate;
    const stepsAhead = period - state.periodStarts.length;
    return this.startOfDay(this.addDays(base, Math.max(0, stepsAhead) * state.periodDays));
  }

  /**
   * Advisory billing state for a student (by User id) — powers the student "what you
   * owe" card and the admin per-student billing view. Consumption-based, not a date.
   */
  async getStudentBillingState(userId: string): Promise<{
    periodsConsumed: number;
    periodsSettled: number;
    suggestedOwed: number;
    overdue: boolean;
    nextDuePeriod: number;
    monthlyFee?: number;
    maxBillable: number;
    windowExceeded: boolean;
    expectedSessionsPerPeriod: number;
    currentWindowAttended: number;
    programDurationMonths?: number;
  }> {
    const participant = await this.studentParticipantModel
      .findOne({ userId: new Types.ObjectId(userId), isActive: true, deletedAt: null })
      .lean()
      .exec();
    if (!participant) {
      throw new NotFoundException('Student participant not found');
    }
    const state = await this.computeBillingState(participant);
    return {
      periodsConsumed: state.periodsConsumed,
      periodsSettled: state.periodsSettled,
      suggestedOwed: state.suggestedOwed,
      overdue: state.overdue,
      nextDuePeriod: state.nextDuePeriod,
      monthlyFee: state.monthlyFee,
      maxBillable: state.maxBillable,
      windowExceeded: state.windowExceeded,
      expectedSessionsPerPeriod: state.expectedSessionsPerPeriod,
      currentWindowAttended: state.currentWindowAttended,
      programDurationMonths: participant.programDurationMonths,
    };
  }

  /**
   * Returns the next unsettled billing period + its window-start date. Used when
   * approving a monthly payment to target the right period. (month/year are ignored
   * now that billing is period-based, not calendar-based — kept for call compatibility.)
   */
  async getNextUnpaidDueDateInMonthYear(
    participantId: string,
    _month?: number,
    _year?: number,
  ): Promise<{ dueDate: Date; period: number } | null> {
    const participant = await this.studentParticipantModel
      .findById(participantId)
      .lean()
      .exec();
    if (!participant) return null;
    const state = await this.computeBillingState(participant);
    const period = state.nextDuePeriod;
    return { dueDate: this.periodWindowStart(state, period), period };
  }

  /**
   * Record a tuition payment against one or more billing PERIODS (consumption-based).
   * - `status: 'paid'`   → settle the period in full (admin asserts payment received).
   * - `status: 'unpaid'` → partial payment: accumulate `paidToDate`; auto-promotes to
   *                         'paid' once the agreed monthly fee is covered.
   * - `status: 'waived'` → settle the period without payment (admin discretion).
   * - `coversPeriods > 1` → advance payment: settle that many consecutive periods.
   * Returns the upserted ledger rows + a fee classification for the approval UI.
   * Nothing here is automatic — the admin chooses what (and whether) to record.
   */
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

    const state = await this.computeBillingState(participant);
    const fee =
      typeof participant.monthlyFee === 'number' && participant.monthlyFee > 0
        ? participant.monthlyFee
        : dto.amount > 0
          ? dto.amount
          : 0;

    const startPeriod = dto.period ?? state.nextDuePeriod;
    if (!Number.isInteger(startPeriod) || startPeriod < 1) {
      throw new BadRequestException('Invalid billing period');
    }
    const coversPeriods =
      dto.status === 'waived' ? 1 : Math.max(1, Math.floor(dto.coversPeriods ?? 1));

    const records: unknown[] = [];
    for (let i = 0; i < coversPeriods; i += 1) {
      const period = startPeriod + i;
      const windowStart = this.periodWindowStart(state, period);
      const month = dto.month ?? windowStart.getMonth() + 1;
      const year = dto.year ?? windowStart.getFullYear();

      const existing = await this.studentPaymentModel
        .findOne({ participantId: participant._id, period })
        .exec();

      // Resolve amount / paidToDate / status for this period.
      let status: 'paid' | 'unpaid' | 'waived';
      let amountField: number;
      let paidToDate: number;
      let paidAt: Date | undefined;

      if (dto.status === 'waived') {
        status = 'waived';
        amountField = 0;
        paidToDate = 0;
        paidAt = undefined;
      } else if (coversPeriods > 1) {
        // Advance: each covered period is paid in full at the agreed fee.
        status = 'paid';
        amountField = fee;
        paidToDate = fee;
        paidAt = new Date();
      } else if (dto.status === 'unpaid') {
        // Partial: accumulate toward the fee; promote to paid once covered.
        const prev = existing?.paidToDate ?? 0;
        paidToDate = prev + Math.max(0, dto.amount);
        amountField = fee || dto.amount;
        status = paidToDate >= amountField && amountField > 0 ? 'paid' : 'unpaid';
        paidAt = status === 'paid' ? new Date() : undefined;
      } else {
        // Paid in full (admin assertion). dto.amount may differ (under/overpay) but
        // the period is settled; the difference is surfaced as classification.
        amountField = fee || dto.amount;
        paidToDate = Math.max(dto.amount, amountField);
        status = 'paid';
        paidAt = new Date();
      }

      if (existing) {
        existing.amount = amountField;
        existing.paidToDate = paidToDate;
        existing.status = status;
        existing.month = month;
        existing.year = year;
        existing.dueDate = windowStart;
        existing.period = period;
        existing.paidAt = paidAt;
        existing.recordedBy = new Types.ObjectId(adminUserId);
        existing.note = dto.note;
        if (dto.receiptUrl) existing.receiptUrl = dto.receiptUrl;
        await existing.save();
        records.push(existing.toObject());
      } else {
        const created = await this.studentPaymentModel.create({
          participantId: participant._id,
          userId: participant.userId,
          amount: amountField,
          paidToDate,
          month,
          year,
          status,
          dueDate: windowStart,
          period,
          paidAt,
          recordedBy: new Types.ObjectId(adminUserId),
          note: dto.note,
          receiptUrl: dto.receiptUrl,
        });
        records.push(created.toObject());
      }
    }

    // Fee classification for the approval UI (total received vs expected).
    const expected = fee * coversPeriods;
    let classification: 'full' | 'partial' | 'overpaid' | 'waived';
    if (dto.status === 'waived') classification = 'waived';
    else if (expected <= 0) classification = 'full';
    else if (dto.amount < expected) classification = 'partial';
    else if (dto.amount > expected) classification = 'overpaid';
    else classification = 'full';

    const refreshed = await this.computeBillingState(participant);
    return {
      payment: records[0],
      records,
      classification,
      expectedAmount: expected,
      receivedAmount: dto.amount,
      billing: {
        periodsConsumed: refreshed.periodsConsumed,
        periodsSettled: refreshed.periodsSettled,
        suggestedOwed: refreshed.suggestedOwed,
        overdue: refreshed.overdue,
        nextDuePeriod: refreshed.nextDuePeriod,
        windowExceeded: refreshed.windowExceeded,
      },
    };
  }

  /**
   * Admin billing roster — consumption-based. For each active student returns their
   * billing state (consumed/settled/owed) and an "owing vs up-to-date" status. The
   * year/month params are kept for signature compatibility but no longer scope the
   * result to a single calendar month (billing is period-based).
   */
  async getStudentBillingSummary(year?: number, month?: number) {
    const current = this.getCurrentYearMonth();
    const targetYear = year ?? current.year;
    const targetMonth = month ?? current.month;

    const students = await this.studentParticipantModel
      .find({ isActive: true })
      .select(
        '_id fullName attendanceNumber instrumentType registrationStartDate programDurationMonths learningDaysPerWeek periodAdjustment monthlyFee userId',
      )
      .lean()
      .exec();

    const totalActiveStudents = students.length;
    let paidCount = 0;
    let unpaidCount = 0;

    const items: Array<{
      participantId: string;
      fullName: string;
      attendanceNumber: string;
      instrumentType: string;
      monthlyFee?: number;
      periodsConsumed: number;
      periodsSettled: number;
      suggestedOwed: number;
      nextDuePeriod: number;
      windowExceeded: boolean;
      status: 'paid' | 'unpaid';
    }> = [];

    for (const student of students) {
      const state = await this.computeBillingState(student);
      const owing = state.suggestedOwed > 0;
      if (owing) unpaidCount += 1;
      else paidCount += 1;
      items.push({
        participantId: String(student._id),
        fullName: student.fullName,
        attendanceNumber: student.attendanceNumber,
        instrumentType: student.instrumentType,
        monthlyFee: state.monthlyFee,
        periodsConsumed: state.periodsConsumed,
        periodsSettled: state.periodsSettled,
        suggestedOwed: state.suggestedOwed,
        nextDuePeriod: state.nextDuePeriod,
        windowExceeded: state.windowExceeded,
        status: owing ? 'unpaid' : 'paid',
      });
    }

    return {
      year: targetYear,
      month: targetMonth,
      totalActiveStudents,
      paidCount, // up-to-date students
      unpaidCount, // students with an outstanding (suggested) balance
      items,
    };
  }

  /** Phase 5.3: optional branchFilter scopes to branch (Admin with branchId). */
  /**
   * Students with an outstanding (suggested) balance — consumption-based. A student is
   * "overdue" only when they have consumed billing periods they haven't settled. Optional
   * branchFilter scopes to a branch. Result is advisory; the admin decides whether to act.
   */
  async getOverduePayments(branchFilter?: { branchId: string }) {
    const now = this.startOfDay(new Date());
    const participantFilter: Record<string, unknown> = { isActive: true };
    if (branchFilter?.branchId && Types.ObjectId.isValid(branchFilter.branchId)) {
      participantFilter.branchId = new Types.ObjectId(branchFilter.branchId);
    }
    const students = await this.studentParticipantModel
      .find(participantFilter)
      .select(
        '_id userId fullName attendanceNumber instrumentType registrationStartDate programDurationMonths learningDaysPerWeek periodAdjustment monthlyFee autoReminders',
      )
      .lean()
      .exec();

    const userIds = [
      ...new Set(
        students
          .map((s) => String((s as { userId?: Types.ObjectId }).userId))
          .filter(Boolean),
      ),
    ];
    const emailByUserId = await this.userService.getEmailsByIds(userIds);

    const overduePayments: Array<{
      participantId: string;
      fullName: string;
      attendanceNumber: string;
      instrumentType: string;
      email?: string;
      year: number;
      month: number;
      dueDate: Date;
      daysOverdue: number;
      amount?: number;
      periodsOwed: number;
      nextDuePeriod: number;
      windowExceeded: boolean;
      autoReminders: boolean;
      status: 'unpaid';
    }> = [];

    for (const student of students) {
      const state = await this.computeBillingState(student);
      if (state.suggestedOwed <= 0) continue;
      const windowStart = this.startOfDay(
        this.periodWindowStart(state, state.nextDuePeriod),
      );
      const daysOverdue = Math.max(
        0,
        Math.floor((now.getTime() - windowStart.getTime()) / 86_400_000),
      );
      overduePayments.push({
        participantId: String(student._id),
        fullName: student.fullName,
        attendanceNumber: student.attendanceNumber,
        instrumentType: student.instrumentType,
        email: emailByUserId.get(
          String((student as { userId?: Types.ObjectId }).userId),
        ),
        year: windowStart.getFullYear(),
        month: windowStart.getMonth() + 1,
        dueDate: windowStart,
        daysOverdue,
        amount: state.monthlyFee,
        periodsOwed: state.suggestedOwed,
        nextDuePeriod: state.nextDuePeriod,
        windowExceeded: state.windowExceeded,
        autoReminders: !!(student as { autoReminders?: boolean }).autoReminders,
        status: 'unpaid',
      });
    }

    overduePayments.sort((a, b) => b.periodsOwed - a.periodsOwed);
    return overduePayments;
  }

  /**
   * The periods a student currently owes (consumption-based). There are no future-dated
   * dues; "upcoming" = the consumed-but-unsettled periods. `studentId` may be a User id
   * (student self-view) or a participant id (admin). `daysAhead` is accepted for API
   * compatibility but does not gate results (billing isn't date-driven).
   */
  async getUpcomingPayments(studentId: string, _daysAhead: number = 14) {
    let participant = await this.studentParticipantModel
      .findOne({ userId: new Types.ObjectId(studentId), deletedAt: null })
      .lean()
      .exec();
    if (!participant && Types.ObjectId.isValid(studentId)) {
      participant = await this.studentParticipantModel
        .findById(studentId)
        .lean()
        .exec();
    }
    if (!participant) {
      throw new NotFoundException('Student participant not found');
    }
    return this.owedPeriodItems(participant);
  }

  /** Build the list of owed-period items for a participant (shared by student + admin views). */
  private async owedPeriodItems(participant: {
    _id: Types.ObjectId | string;
    registrationStartDate?: Date;
    programDurationMonths?: number;
    learningDaysPerWeek?: number;
    periodAdjustment?: number;
    monthlyFee?: number;
  }) {
    const state = await this.computeBillingState(participant);
    const now = this.startOfDay(new Date()).getTime();
    const items: Array<{
      year: number;
      month: number;
      dueDate: Date;
      period: number;
      daysUntilDue: number;
      amount?: number;
      status: 'unpaid';
    }> = [];
    for (let period = state.nextDuePeriod; period <= state.periodsConsumedEff; period += 1) {
      if (state.settledPeriods.includes(period)) continue;
      const windowStart = this.startOfDay(this.periodWindowStart(state, period));
      items.push({
        year: windowStart.getFullYear(),
        month: windowStart.getMonth() + 1,
        dueDate: windowStart,
        period,
        daysUntilDue: Math.floor((windowStart.getTime() - now) / 86_400_000),
        amount: state.monthlyFee,
        status: 'unpaid',
      });
    }
    return items;
  }

  /** For admin dashboards / reminders: owed periods for all students (optionally branch-scoped). */
  async getUpcomingPaymentsForAllStudents(
    _daysAhead: number = 7,
    branchFilter?: { branchId: string },
  ) {
    const participantFilter: Record<string, unknown> = { isActive: true };
    if (branchFilter?.branchId && Types.ObjectId.isValid(branchFilter.branchId)) {
      participantFilter.branchId = new Types.ObjectId(branchFilter.branchId);
    }
    const students = await this.studentParticipantModel
      .find(participantFilter)
      .select(
        '_id userId fullName registrationStartDate programDurationMonths learningDaysPerWeek periodAdjustment monthlyFee',
      )
      .lean()
      .exec();
    const userIds = [
      ...new Set(
        students
          .map((s) => String((s as { userId?: Types.ObjectId }).userId))
          .filter(Boolean),
      ),
    ];
    const emailByUserId = await this.userService.getEmailsByIds(userIds);
    const result: Array<{
      participantId: string;
      fullName: string;
      email: string;
      dueDate: Date;
      daysUntilDue: number;
      amount?: number;
      year: number;
      month: number;
    }> = [];
    for (const student of students) {
      const email = emailByUserId.get(
        String((student as { userId?: Types.ObjectId }).userId),
      );
      if (!email) continue;
      const items = await this.owedPeriodItems(student);
      for (const u of items) {
        result.push({
          participantId: String(student._id),
          fullName: student.fullName,
          email,
          dueDate: u.dueDate,
          daysUntilDue: u.daysUntilDue,
          amount: u.amount,
          year: u.year,
          month: u.month,
        });
      }
    }
    return result;
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

    const presentCount = attendanceRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
    const absentCount = attendanceRecords.filter((r) => r.status === 'absent').length;
    const excusedCount = attendanceRecords.filter((r) => r.status === 'excused').length;
    const total = attendanceRecords.length;
    const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) / 100 : 0;

    return {
      student: {
        fullName: student.fullName,
        attendanceNumber: student.attendanceNumber,
        instrumentType: student.instrumentType,
        registrationStartDate: student.registrationStartDate,
        branch: student.branchId,
        learningType: student.learningType,
        programDurationMonths: student.programDurationMonths,
        missedLessonsCount: (student as { missedLessonsCount?: number }).missedLessonsCount ?? 0,
      },
      attendanceRecords: attendanceRecords.map((record) => ({
        date: record.sessionDate,
        lesson: record.lessonId,
        revisedLesson: record.revisedLessonId,
        status: record.status,
        recordedBy: record.recordedBy,
      })),
      totalSessions: total,
      presentCount,
      absentCount,
      excusedCount,
      lateCount: attendanceRecords.filter((r) => r.status === 'late').length,
      attendanceRate,
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
      .reduce((sum, p) => sum + (p.paidToDate ?? p.amount ?? 0), 0);

    // Each row already carries its period + window-start dueDate (consumption-based);
    // no inference needed. Include the live billing summary for context.
    const state = await this.computeBillingState(student);
    const paymentsWithDue = payments
      .slice()
      .sort((a, b) => (a.period ?? 0) - (b.period ?? 0))
      .map((payment) => ({
        period: payment.period ?? undefined,
        month: payment.month,
        year: payment.year,
        amount: payment.amount,
        paidToDate: payment.paidToDate ?? undefined,
        status: payment.status,
        dueDate: payment.dueDate ?? null,
        paidAt: payment.paidAt,
        note: payment.note,
        recordedBy: payment.recordedBy,
      }));

    return {
      student: {
        fullName: student.fullName,
        attendanceNumber: student.attendanceNumber,
        instrumentType: student.instrumentType,
        registrationStartDate: student.registrationStartDate,
        branch: student.branchId,
        monthlyFee: student.monthlyFee,
      },
      payments: paymentsWithDue,
      totalPaid,
      totalPayments: payments.length,
      paidCount: payments.filter((p) => p.status === 'paid').length,
      unpaidCount: payments.filter((p) => p.status === 'unpaid').length,
      waivedCount: payments.filter((p) => p.status === 'waived').length,
      billing: {
        periodsConsumed: state.periodsConsumed,
        periodsSettled: state.periodsSettled,
        suggestedOwed: state.suggestedOwed,
        overdue: state.overdue,
        nextDuePeriod: state.nextDuePeriod,
        maxBillable: state.maxBillable,
        windowExceeded: state.windowExceeded,
        monthlyFee: state.monthlyFee,
      },
      generatedAt: new Date(),
    };
  }

  /** Admin: attendance summary for a date range (counts by status and per-student rates). */
  async getAttendanceSummary(startDate?: Date, endDate?: Date) {
    const query: any = {};
    if (startDate || endDate) {
      query.sessionDate = {};
      if (startDate) query.sessionDate.$gte = startDate;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.sessionDate.$lte = end;
      }
    }

    const records = await this.studentAttendanceModel
      .find(query)
      .select('participantId attendanceNumber studentName status sessionDate')
      .lean()
      .exec();

    const presentCount = records.filter((r) => r.status === 'present').length;
    const lateCount = records.filter((r) => r.status === 'late').length;
    const excusedCount = records.filter((r) => r.status === 'excused').length;
    const absentCount = records.filter((r) => r.status === 'absent').length;
    const total = records.length;
    const attendanceRate = total > 0 ? Math.round((presentCount + lateCount) / total * 100) / 100 : 0;

    const byParticipant = new Map<string, { present: number; late: number; excused: number; absent: number; total: number }>();
    for (const r of records) {
      const key = String(r.participantId);
      if (!byParticipant.has(key)) {
        byParticipant.set(key, { present: 0, late: 0, excused: 0, absent: 0, total: 0 });
      }
      const row = byParticipant.get(key)!;
      row.total += 1;
      if (r.status === 'present') row.present += 1;
      else if (r.status === 'late') row.late += 1;
      else if (r.status === 'excused') row.excused += 1;
      else row.absent += 1;
    }

    const participantIds = [...byParticipant.keys()];
    const participantObjectIds = participantIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    const participants = await this.studentParticipantModel
      .find({ _id: { $in: participantObjectIds } })
      .select('_id fullName attendanceNumber instrumentType')
      .lean()
      .exec();
    const participantMap = new Map(participants.map((p) => [String(p._id), p]));

    const studentRates = participantIds.map((id) => {
      const row = byParticipant.get(id)!;
      const p = participantMap.get(id);
      const rate = row.total > 0 ? Math.round((row.present + row.late) / row.total * 100) / 100 : 0;
      return {
        participantId: id,
        fullName: (p as { fullName?: string })?.fullName,
        attendanceNumber: (p as { attendanceNumber?: string })?.attendanceNumber,
        instrumentType: (p as { instrumentType?: string })?.instrumentType,
        totalSessions: row.total,
        present: row.present,
        late: row.late,
        excused: row.excused,
        absent: row.absent,
        attendanceRate: rate,
      };
    });

    return {
      period: { startDate: startDate ?? null, endDate: endDate ?? null },
      totalRecords: total,
      presentCount,
      lateCount,
      excusedCount,
      absentCount,
      overallAttendanceRate: attendanceRate,
      studentRates: studentRates.sort((a, b) => (b.totalSessions - a.totalSessions)),
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
