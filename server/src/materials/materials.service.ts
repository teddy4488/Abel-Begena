import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InstrumentMaterial, InstrumentMaterialDocument } from './schemas/instrument-material.schema';
import { UploadService } from '../upload/upload.service';
import { InstrumentType } from '../product/schemas/product.schema';

type AuthenticatedUser = {
  sub: string;
  role?: string;
};

@Injectable()
export class MaterialsService {
  constructor(
    @InjectModel(InstrumentMaterial.name)
    private readonly materialModel: Model<InstrumentMaterialDocument>,
    private readonly uploadService: UploadService,
  ) {}

  async uploadMaterial(
    file: Express.Multer.File,
    title: string,
    instrumentType: InstrumentType,
    uploadedBy: string,
    description?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Material file is required');
    }

    // Determine file type
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
    let fileType: 'pdf' | 'image' | 'video' | 'other' = 'other';
    
    if (fileExtension === 'pdf') {
      fileType = 'pdf';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension)) {
      fileType = 'image';
    } else if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(fileExtension)) {
      fileType = 'video';
    }

    // Upload file
    const url = await this.uploadService.uploadMaterial(
      file,
      `abel-begena/materials/${instrumentType.toLowerCase()}`,
    );

    // Create material record
    const material = await this.materialModel.create({
      title,
      url,
      instrumentType,
      uploadedBy: new Types.ObjectId(uploadedBy),
      description,
      fileType,
      uploadedAt: new Date(),
    });

    return material.toObject();
  }

  async getMaterialsByInstrument(instrumentType?: InstrumentType) {
    const filter: any = { isActive: true };
    if (instrumentType) {
      filter.instrumentType = instrumentType;
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
    if (material.uploadedBy.toString() !== teacherId) {
      throw new BadRequestException('You can only delete materials you uploaded');
    }

    await material.deleteOne();
    return { message: 'Material deleted successfully' };
  }
}
