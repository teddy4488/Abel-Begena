import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  Class,
  ClassDocument,
  ClassSession,
} from './schemas/class.schema';
import { UploadService } from '../upload/upload.service';
import { UpdateLiveStateDto } from './dto/update-live-state.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CreateScheduleItemDto } from './dto/create-schedule-item.dto';
import { UpdateScheduleItemDto } from './dto/update-schedule-item.dto';

@Injectable()
export class ClassService {
  constructor(
    @InjectModel(Class.name)
    private readonly classModel: Model<ClassDocument>,
    private readonly configService: ConfigService,
    private readonly uploadService: UploadService,
  ) {}

  findAll() {
    return this.classModel
      .find()
      .select('title isLive instructorId createdAt')
      .lean()
      .exec();
  }

  getManagedCatalog() {
    return this.classModel
      .find()
      .populate('instructorId', 'firstName lastName email avatarUrl')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async createClass(dto: CreateClassDto) {
    const payload: Partial<Class> = {
      title: dto.title,
      description: dto.description,
      capacity: dto.capacity,
    };

    if (dto.instructorId) {
      if (!Types.ObjectId.isValid(dto.instructorId)) {
        throw new BadRequestException('Invalid instructor id');
      }
      payload.instructorId = new Types.ObjectId(dto.instructorId);
    }

    if (dto.startDate) {
      payload.startDate = new Date(dto.startDate);
    }

    if (dto.endDate) {
      payload.endDate = new Date(dto.endDate);
    }

    const created = await this.classModel.create(payload);
    return created.toObject();
  }

  async updateClass(id: string, dto: UpdateClassDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class id');
    }

    const update: Partial<Class> = {
      ...(dto.title ? { title: dto.title } : {}),
      ...(dto.description ? { description: dto.description } : {}),
    };

    if (typeof dto.capacity === 'number') {
      update.capacity = dto.capacity;
    }

    if (dto.startDate) {
      update.startDate = new Date(dto.startDate);
    }

    if (dto.endDate) {
      update.endDate = new Date(dto.endDate);
    }

    if (dto.instructorId) {
      if (!Types.ObjectId.isValid(dto.instructorId)) {
        throw new BadRequestException('Invalid instructor id');
      }
      update.instructorId = new Types.ObjectId(dto.instructorId);
    }

    const updated = await this.classModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('instructorId', 'firstName lastName email avatarUrl')
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Class not found');
    }

    return updated;
  }

  async removeClass(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class id');
    }
    const removed = await this.classModel.findByIdAndDelete(id).lean().exec();
    if (!removed) {
      throw new NotFoundException('Class not found');
    }
    return { message: 'Class removed' };
  }

  getPublicCatalog(limit = 6) {
    return this.classModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('title isLive createdAt')
      .lean()
      .exec();
  }

  findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    return this.classModel.findById(id).exec();
  }

  async getAccessPayload(id: string) {
    const classEntity = await this.classModel.findById(id).lean().exec();

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const baseUrl =
      this.configService.get<string>('MEETING_PROVIDER_BASE_URL') ?? '';
    const sanitizedBase = baseUrl.endsWith('/')
      ? baseUrl.slice(0, -1)
      : baseUrl;

    return {
      materials: classEntity.materials ?? [],
      isLive: classEntity.isLive ?? false,
      liveLink: classEntity.liveRoomCode
        ? `${sanitizedBase}/${classEntity.liveRoomCode}`
        : null,
      class: {
        _id: classEntity._id,
        title: classEntity.title,
      },
    };
  }

  async appendMaterial(
    classId: string,
    file: Express.Multer.File,
    title: string,
  ) {
    const classEntity = await this.classModel.findById(classId).exec();

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const url = await this.uploadService.uploadMaterial(file);

    classEntity.materials = classEntity.materials ?? [];

    classEntity.materials.push({
      title: title || file.originalname,
      url,
      uploadedAt: new Date(),
    });

    await classEntity.save();

    return classEntity;
  }

  async updateLiveState(id: string, dto: UpdateLiveStateDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Class not found');
    }

    const updatePayload: Partial<Class> = {};

    if (typeof dto.isLive === 'boolean') {
      updatePayload.isLive = dto.isLive;
    }

    if (typeof dto.liveRoomCode !== 'undefined') {
      updatePayload.liveRoomCode = dto.liveRoomCode || undefined;
    }

    const updated = await this.classModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .select('title isLive liveRoomCode materials instructorId createdAt')
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Class not found');
    }

    return updated;
  }

  async assignInstructor(classId: string, instructorId: string) {
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid class id');
    }
    if (!Types.ObjectId.isValid(instructorId)) {
      throw new BadRequestException('Invalid instructor id');
    }

    const updated = await this.classModel
      .findByIdAndUpdate(
        classId,
        { instructorId: new Types.ObjectId(instructorId) },
        { new: true },
      )
      .populate('instructorId', 'firstName lastName email avatarUrl')
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Class not found');
    }

    return updated;
  }

  async getClassRoster(classId: string) {
    this.ensureValidClassId(classId);
    const roster = await this.classModel
      .findById(classId)
      .select('title enrollments')
      .populate('enrollments.student', 'firstName lastName email avatarUrl')
      .lean()
      .exec();

    if (!roster) {
      throw new NotFoundException('Class not found');
    }

    const students = (roster.enrollments ?? [])
      .filter((enrollment) => enrollment.status !== 'withdrawn')
      .map((enrollment) => {
        const student = enrollment.student as unknown as {
          _id: Types.ObjectId | string;
          firstName?: string;
          lastName?: string;
          email?: string;
          avatarUrl?: string;
        };

        return {
          _id: student?._id?.toString?.() ?? '',
          firstName: student?.firstName ?? null,
          lastName: student?.lastName ?? null,
          email: student?.email ?? '',
          avatarUrl: student?.avatarUrl ?? null,
          enrolledAt: enrollment.enrolledAt,
          status: enrollment.status,
        };
      });

    return {
      classId: roster._id.toString(),
      title: roster.title,
      students,
    };
  }

  async getClassSchedule(classId: string) {
    this.ensureValidClassId(classId);
    const classEntity = await this.classModel
      .findById(classId)
      .select('schedule')
      .lean()
      .exec();

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return this.mapScheduleResponse(classEntity.schedule ?? []);
  }

  async addScheduleItem(classId: string, dto: CreateScheduleItemDto) {
    this.ensureValidClassId(classId);
    const classEntity = await this.classModel.findById(classId).exec();

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const newSession: ClassSession = {
      _id: new Types.ObjectId(),
      title: dto.title,
      startTime: new Date(dto.startTime),
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      location: dto.location,
      notes: dto.notes,
    };

    classEntity.schedule = classEntity.schedule ?? [];
    classEntity.schedule.push(newSession as any);
    classEntity.markModified('schedule');
    await classEntity.save();

    return this.mapScheduleResponse(classEntity.schedule);
  }

  async updateScheduleItem(
    classId: string,
    sessionId: string,
    dto: UpdateScheduleItemDto,
  ) {
    this.ensureValidClassId(classId);
    const classEntity = await this.classModel.findById(classId).exec();

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const targetIndex = (classEntity.schedule ?? []).findIndex(
      (session) => session._id?.toString() === sessionId,
    );

    if (targetIndex === -1) {
      throw new NotFoundException('Schedule entry not found');
    }

    const targetSession = classEntity.schedule[targetIndex];

    if (dto.title) {
      targetSession.title = dto.title;
    }

    if (dto.startTime) {
      targetSession.startTime = new Date(dto.startTime);
    }

    if (typeof dto.endTime !== 'undefined') {
      targetSession.endTime = dto.endTime ? new Date(dto.endTime) : undefined;
    }

    if (typeof dto.location !== 'undefined') {
      targetSession.location = dto.location;
    }

    if (typeof dto.notes !== 'undefined') {
      targetSession.notes = dto.notes;
    }

    classEntity.schedule[targetIndex] = targetSession;
    classEntity.markModified('schedule');
    await classEntity.save();

    return this.mapScheduleResponse(classEntity.schedule);
  }

  async removeScheduleItem(classId: string, sessionId: string) {
    this.ensureValidClassId(classId);
    const classEntity = await this.classModel.findById(classId).exec();

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const nextSchedule = (classEntity.schedule ?? []).filter(
      (session) => session._id?.toString() !== sessionId,
    );

    if (nextSchedule.length === (classEntity.schedule ?? []).length) {
      throw new NotFoundException('Schedule entry not found');
    }

    classEntity.schedule = nextSchedule as any;
    classEntity.markModified('schedule');
    await classEntity.save();

    return this.mapScheduleResponse(classEntity.schedule);
  }

  private mapScheduleResponse(schedule: ClassSession[]) {
    return (schedule ?? [])
      .map((session) => ({
        _id: session._id?.toString() ?? '',
        title: session.title,
        startTime: session.startTime?.toISOString() ?? null,
        endTime: session.endTime ? session.endTime.toISOString() : null,
        location: session.location ?? null,
        notes: session.notes ?? null,
      }))
      .sort((a, b) => {
        const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
        const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
        return aTime - bTime;
      });
  }

  private ensureValidClassId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Class not found');
    }
  }
}
