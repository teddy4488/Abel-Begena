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
}
