import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Branch, BranchDocument } from './schemas/branch.schema';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchService {
  constructor(
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
  ) {}

  private notDeletedFilter() {
    return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
  }

  async findAllActive() {
    return this.branchModel
      .find({ isActive: true, ...this.notDeletedFilter() })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  }

  async findAll(branchId?: string) {
    const filter = this.notDeletedFilter();
    if (branchId && Types.ObjectId.isValid(branchId)) {
      (filter as Record<string, unknown>)._id = new Types.ObjectId(branchId);
    }
    return this.branchModel.find(filter).sort({ createdAt: 1 }).lean().exec();
  }

  async create(dto: CreateBranchDto) {
    const doc = await this.branchModel.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      address: dto.address,
      city: dto.city,
      region: dto.region,
      location: {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      },
      radiusMeters: dto.radiusMeters ?? 500,
      isActive: dto.isActive ?? true,
    });
    return doc.toObject();
  }

  async update(id: string, dto: UpdateBranchDto) {
    const update: Record<string, unknown> = {
      ...dto,
    };

    if (typeof dto.latitude === 'number' && typeof dto.longitude === 'number') {
      update.location = {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      };
      delete update.latitude;
      delete update.longitude;
    }

    const updated = await this.branchModel
      .findByIdAndUpdate(id, update, { new: true })
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Branch not found');
    }

    return updated;
  }

  async remove(id: string) {
    const updated = await this.branchModel
      .findOneAndUpdate(
        { _id: id, ...this.notDeletedFilter() },
        { deletedAt: new Date(), isActive: false },
        { new: true },
      )
      .lean()
      .exec();
    if (!updated) {
      throw new NotFoundException('Branch not found');
    }
    return { message: 'Branch removed' };
  }
}
