import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Class, ClassDocument } from './schemas/class.schema';
import { UploadService } from '../upload/upload.service';

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      title: title || file.originalname,
      url,
      uploadedAt: new Date(),
    });

    await classEntity.save();

    return classEntity;
  }
}
