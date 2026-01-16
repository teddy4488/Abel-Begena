import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
  ) {}

  // Helpers
  private generateAttendanceNumber(): string {
    // Generate 5-digit numeric code
    return Math.floor(10000 + Math.random() * 90000).toString();
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

    const created = await this.teacherParticipantModel.create({
      fullName: dto.fullName.trim(),
      instruments: dto.instruments,
      teachingDays: dto.teachingDays,
      timeRanges: dto.timeRanges,
      isActive: true,
    });
    return created.toObject();
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
      attendanceNumber = this.generateAttendanceNumber();
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

    const created = await this.studentParticipantModel.create({
      fullName: dto.fullName.trim(),
      attendanceNumber,
      branchId: new Types.ObjectId(dto.branchId),
      learningType: dto.learningType,
      instrumentType: dto.instrumentType,
      programDurationMonths: dto.programDurationMonths,
      preferredLearningDays: dto.preferredLearningDays,
      registrationStartDate: new Date(dto.registrationStartDate),
      learningDaysPerWeek,
      isActive: true,
    });
    return created.toObject();
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

  // Billing / payments
  private getCurrentYearMonth() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
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

    const month = dto.month;
    const year = dto.year;

    if (month < 1 || month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }

    // Upsert-style: if a record exists for this participant/month/year, update it
    const existing = await this.studentPaymentModel
      .findOne({
        participantId: participant._id,
        month,
        year,
      })
      .exec();

    if (existing) {
      existing.amount = dto.amount;
      existing.status = dto.status;
      existing.note = dto.note;
      existing.paidAt =
        dto.status === 'paid' || dto.status === 'partial'
          ? new Date()
          : undefined;
      existing.recordedBy = new Types.ObjectId(adminUserId);
      await existing.save();
      return existing.toObject();
    }

    const created = await this.studentPaymentModel.create({
      participantId: participant._id,
      amount: dto.amount,
      month,
      year,
      status: dto.status,
      paidAt:
        dto.status === 'paid' || dto.status === 'partial'
          ? new Date()
          : undefined,
      recordedBy: new Types.ObjectId(adminUserId),
      // dueDate could be derived from registration date + month; keep empty for now
      note: dto.note,
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
}
