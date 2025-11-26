import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Class, ClassDocument } from './schemas/class.schema';
import { UploadService } from '../upload/upload.service';
import { UpdateLiveStateDto } from './dto/update-live-state.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

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
}
