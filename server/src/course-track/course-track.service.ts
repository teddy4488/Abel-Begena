import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCourseTrackDto } from './dto/create-course-track.dto';
import { UpdateCourseTrackDto } from './dto/update-course-track.dto';
import { CourseTrack, CourseTrackDocument } from './schemas/course-track.schema';

@Injectable()
export class CourseTrackService {
  constructor(
    @InjectModel(CourseTrack.name)
    private readonly courseTrackModel: Model<CourseTrackDocument>,
  ) {}

  async listPublic() {
    return this.courseTrackModel
      .find({ isActive: true })
      .sort({ instrumentType: 1, level: 1, title: 1 })
      .lean()
      .exec();
  }

  async listManaged() {
    return this.courseTrackModel
      .find()
      .sort({ instrumentType: 1, level: 1, title: 1 })
      .lean()
      .exec();
  }

  findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.courseTrackModel.findById(id).lean().exec();
  }

  async create(dto: CreateCourseTrackDto) {
    const lessonIds =
      (dto.lessonIds ?? [])
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id)) ?? [];

    try {
      const created = await this.courseTrackModel.create({
        instrumentType: dto.instrumentType,
        level: dto.level,
        title: dto.title,
        description: dto.description,
        lessonIds,
        isActive: dto.isActive ?? true,
      });
      return created.toObject();
    } catch (e: any) {
      // Handle unique index conflicts (instrumentType+level)
      if (e?.code === 11000) {
        throw new BadRequestException(
          'A course track already exists for this instrument and level',
        );
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateCourseTrackDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Course track not found');
    }

    const update: Partial<CourseTrack> = {};
    if (dto.instrumentType) update.instrumentType = dto.instrumentType;
    if (dto.level) update.level = dto.level;
    if (typeof dto.title === 'string') update.title = dto.title;
    if (typeof dto.description !== 'undefined') update.description = dto.description;
    if (typeof dto.isActive === 'boolean') update.isActive = dto.isActive;
    if (dto.lessonIds) {
      update.lessonIds = dto.lessonIds
        .filter((x) => Types.ObjectId.isValid(x))
        .map((x) => new Types.ObjectId(x));
    }

    try {
      const updated = await this.courseTrackModel
        .findByIdAndUpdate(id, update, { new: true })
        .lean()
        .exec();
      if (!updated) {
        throw new NotFoundException('Course track not found');
      }
      return updated;
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new BadRequestException(
          'A course track already exists for this instrument and level',
        );
      }
      throw e;
    }
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Course track not found');
    }
    const removed = await this.courseTrackModel.findByIdAndDelete(id).lean().exec();
    if (!removed) {
      throw new NotFoundException('Course track not found');
    }
    return { message: 'Course track removed' };
  }
}

