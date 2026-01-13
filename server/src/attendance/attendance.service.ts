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
    // 5-digit numeric code; in a real system could be more sophisticated
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  // Participants
  async registerTeacherParticipant(dto: RegisterTeacherParticipantDto) {
    const userId = new Types.ObjectId(dto.userId);
    const existing = await this.teacherParticipantModel
      .findOne({ userId })
      .lean()
      .exec();
    if (existing) {
      throw new BadRequestException('Teacher participant already exists');
    }
    const created = await this.teacherParticipantModel.create({
      userId,
      displayName: dto.displayName,
      isActive: true,
    });
    return created.toObject();
  }

  async registerStudentParticipant(dto: RegisterStudentParticipantDto) {
    const userId = new Types.ObjectId(dto.userId);
    const existing = await this.studentParticipantModel
      .findOne({ userId })
      .lean()
      .exec();
    if (existing) {
      throw new BadRequestException('Student participant already exists');
    }

    const attendanceNumber =
      dto.attendanceNumber?.trim() || this.generateAttendanceNumber();

    const conflict = await this.studentParticipantModel
      .findOne({ attendanceNumber })
      .lean()
      .exec();
    if (conflict) {
      throw new BadRequestException(
        'Attendance number already in use. Please choose another.',
      );
    }

    const created = await this.studentParticipantModel.create({
      userId,
      attendanceNumber,
      instrumentType: dto.instrumentType,
      programDurationMonths: dto.programDurationMonths,
      classId: dto.classId ? new Types.ObjectId(dto.classId) : undefined,
      isActive: true,
    });
    return created.toObject();
  }

  async listTeacherParticipants() {
    return this.teacherParticipantModel
      .find()
      .populate('userId', 'firstName lastName email role')
      .lean()
      .exec();
  }

  async listStudentParticipants() {
    return this.studentParticipantModel
      .find()
      .populate('userId', 'firstName lastName email role')
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

    const openRecord = await this.teacherAttendanceModel
      .findOne({
        participantId: participant._id,
        checkOutAt: { $exists: false },
      })
      .lean()
      .exec();
    if (openRecord) {
      throw new BadRequestException(
        'Teacher already has an open attendance session',
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
      .populate('participantId')
      .populate('recordedBy', 'firstName lastName email')
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
      .findOne({ attendanceNumber: dto.attendanceNumber, isActive: true })
      .exec();
    if (!participant) {
      throw new NotFoundException('Student not found in attendance registry');
    }

    if (!Types.ObjectId.isValid(dto.lessonId)) {
      throw new BadRequestException('Invalid lesson id');
    }

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

    let revisedLessonId: Types.ObjectId | undefined;
    if (dto.revisedLessonId) {
      if (!Types.ObjectId.isValid(dto.revisedLessonId)) {
        throw new BadRequestException('Invalid revised lesson id');
      }
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

    const created = await this.studentAttendanceModel.create({
      participantId: participant._id,
      attendanceNumber: participant.attendanceNumber,
      instrumentType: participant.instrumentType,
      programDurationMonths: participant.programDurationMonths,
      lessonId: new Types.ObjectId(dto.lessonId),
      revisedLessonId,
      status: dto.status,
      recordedBy: new Types.ObjectId(adminUserId),
    });

    return created.toObject();
  }

  async listInstrumentLessons(instrumentType?: string) {
    const filter = instrumentType ? { instrumentType, isActive: true } : {};
    return this.lessonModel.find(filter).sort({ order: 1 }).lean().exec();
  }
}

