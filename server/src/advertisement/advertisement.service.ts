import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Advertisement,
  AdvertisementDocument,
} from './schemas/advertisement.schema';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import {
  UploadService,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_VIDEO_MIMES,
  ALLOWED_VIDEO_EXTENSIONS,
  MAX_IMAGE_SIZE_BYTES,
} from '../upload/upload.service';

const MAX_AD_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

export type AdLean = Advertisement & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class AdvertisementService {
  constructor(
    @InjectModel(Advertisement.name)
    private readonly adModel: Model<AdvertisementDocument>,
    private readonly uploadService: UploadService,
  ) {}

  async uploadMedia(
    file: Express.Multer.File,
  ): Promise<{ mediaUrl: string; mediaType: 'video' | 'image' }> {
    const isVideo = (ALLOWED_VIDEO_MIMES as readonly string[]).includes(
      file.mimetype,
    );
    const isImage = (ALLOWED_IMAGE_MIMES as readonly string[]).includes(
      file.mimetype,
    );

    if (!isVideo && !isImage) {
      throw new BadRequestException(
        'Invalid file type. Allowed: images (JPG, PNG, WebP) or videos (MP4, WebM, MOV)',
      );
    }

    const mediaUrl = await this.uploadService.uploadMaterial(
      file,
      'abel-begena/advertisements',
      {
        allowedMimeTypes: isVideo
          ? [...ALLOWED_VIDEO_MIMES]
          : [...ALLOWED_IMAGE_MIMES],
        allowedExtensions: isVideo
          ? [...ALLOWED_VIDEO_EXTENSIONS]
          : [...ALLOWED_IMAGE_EXTENSIONS],
        maxSizeBytes: isVideo ? MAX_AD_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES,
      },
    );

    return { mediaUrl, mediaType: isVideo ? 'video' : 'image' };
  }

  async create(
    dto: CreateAdvertisementDto,
    actorId: string,
  ): Promise<AdLean> {
    const doc = await this.adModel.create({
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      uploadedBy: new Types.ObjectId(actorId),
    });
    return doc.toObject() as AdLean;
  }

  async findActive(): Promise<AdLean[]> {
    const now = new Date();
    const results = await this.adModel
      .find({
        isActive: true,
        $and: [
          { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
          { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
        ],
      })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return results as AdLean[];
  }

  async findAll(): Promise<AdLean[]> {
    const results = await this.adModel
      .find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return results as AdLean[];
  }

  async update(id: string, dto: UpdateAdvertisementDto): Promise<AdLean> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid advertisement id');
    }
    const update: Record<string, unknown> = { ...dto };
    if (dto.startDate !== undefined) {
      update.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.endDate !== undefined) {
      update.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }
    const result = await this.adModel
      .findByIdAndUpdate(id, update, { new: true })
      .lean()
      .exec();
    if (!result) throw new NotFoundException('Advertisement not found');
    return result as AdLean;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid advertisement id');
    }
    const ad = await this.adModel.findByIdAndDelete(id).exec();
    if (!ad) throw new NotFoundException('Advertisement not found');
    return { message: 'Advertisement deleted' };
  }
}
