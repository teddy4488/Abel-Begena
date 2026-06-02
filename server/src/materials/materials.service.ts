import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InstrumentMaterial, InstrumentMaterialDocument } from './schemas/instrument-material.schema';
import {
  UploadService,
  ALLOWED_MATERIAL_MIMES,
  ALLOWED_MATERIAL_EXTENSIONS,
  ALLOWED_VIDEO_EXTENSIONS,
  MAX_VIDEO_SIZE_BYTES,
} from '../upload/upload.service';
import { InstrumentType } from '../product/schemas/product.schema';
import { Class, ClassDocument } from '../class/schemas/class.schema';

/**
 * Instrument materials: files (PDFs, images) attached to a class and optionally to a specific lesson.
 * These are stored in the InstrumentMaterial collection. Separate from Class.materials, which is
 * an embedded array on the Class document (used for class-level links returned in class access).
 */
type AuthenticatedUser = {
  sub: string;
  role?: string;
};

@Injectable()
export class MaterialsService {
  constructor(
    @InjectModel(InstrumentMaterial.name)
    private readonly materialModel: Model<InstrumentMaterialDocument>,
    @InjectModel(Class.name)
    private readonly classModel: Model<ClassDocument>,
    private readonly uploadService: UploadService,
  ) {}

  async uploadMaterial(
    file: Express.Multer.File,
    title: string,
    classId: string,
    uploadedBy: string,
    description?: string,
    lessonId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Material file is required');
    }

    // Resolve class and inferred instrument
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestException('Invalid classId');
    }
    const klass = await this.classModel.findById(classId).lean().exec();
    if (!klass) {
      throw new NotFoundException('Class not found');
    }
    const instrumentType = (klass as any).instrumentType as InstrumentType | undefined;

    // Upload file (validates: images + PDF + video, max size)
    const url = await this.uploadService.uploadMaterial(
      file,
      `abel-begena/materials/${instrumentType ? instrumentType.toLowerCase() : 'class'}`,
      {
        allowedMimeTypes: [...ALLOWED_MATERIAL_MIMES],
        allowedExtensions: [...ALLOWED_MATERIAL_EXTENSIONS],
        maxSizeBytes: MAX_VIDEO_SIZE_BYTES,
      },
    );

    // Determine file type for storage metadata
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
    let fileType: 'pdf' | 'image' | 'video' | 'other' = 'other';
    if (fileExtension === 'pdf') {
      fileType = 'pdf';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
      fileType = 'image';
    } else if (ALLOWED_VIDEO_EXTENSIONS.includes(`.${fileExtension}` as never)) {
      fileType = 'video';
    }

    // Create material record
    const material = await this.materialModel.create({
      title,
      url,
      classId: new Types.ObjectId(classId),
      instrumentType,
      lessonId: lessonId ? new Types.ObjectId(lessonId) : undefined,
      uploadedBy: new Types.ObjectId(uploadedBy),
      description,
      fileType,
      uploadedAt: new Date(),
    });

    return material.toObject();
  }

  /** List instrument materials, optionally filtered by class (returns class-level and lesson-level materials for that class). */
  async getMaterialsByClass(classId?: string) {
    const filter: any = { isActive: true };
    if (classId) {
      if (!Types.ObjectId.isValid(classId)) {
        throw new BadRequestException('Invalid classId');
      }
      filter.classId = new Types.ObjectId(classId);
    }

    const materials = await this.materialModel
      .find(filter)
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ uploadedAt: -1 })
      .lean()
      .exec();

    return materials;
  }

  async getMaterialsForTeacher(teacherId: string) {
    const materials = await this.materialModel
      .find({ uploadedBy: new Types.ObjectId(teacherId) })
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ uploadedAt: -1 })
      .lean()
      .exec();

    return materials;
  }

  async deleteMaterial(materialId: string, teacherId: string) {
    const material = await this.materialModel.findById(materialId).exec();

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    // Only allow deletion by the uploader or admin
    if (teacherId && material.uploadedBy.toString() !== teacherId) {
      throw new BadRequestException('You can only delete materials you uploaded');
    }

    await material.deleteOne();
    return { message: 'Material deleted successfully' };
  }
}
