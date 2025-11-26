import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ContentBlock,
  ContentBlockDocument,
} from './schemas/content-block.schema';
import { CreateContentBlockDto } from './dto/create-content-block.dto';
import { UpdateContentBlockDto } from './dto/update-content-block.dto';

@Injectable()
export class CmsService {
  constructor(
    @InjectModel(ContentBlock.name)
    private readonly contentModel: Model<ContentBlockDocument>,
  ) {}

  async findAll(lang?: 'en' | 'am') {
    const blocks = await this.contentModel
      .find()
      .sort({ key: 1 })
      .lean()
      .exec();
    if (!lang) {
      return blocks;
    }
    return blocks.map((block) => ({
      key: block.key,
      label: block.label,
      description: block.description,
      value: block.content?.[lang] ?? '',
    }));
  }

  async findByKey(key: string) {
    const block = await this.contentModel.findOne({ key }).lean().exec();
    if (!block) {
      throw new NotFoundException('Content block not found');
    }
    return block;
  }

  async create(dto: CreateContentBlockDto) {
    const existing = await this.contentModel
      .findOne({ key: dto.key })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException('Key already exists');
    }

    const created = await this.contentModel.create({
      key: dto.key,
      label: dto.label,
      description: dto.description,
      content: {
        en: dto.en,
        am: dto.am,
      },
    });
    return created.toObject();
  }

  async update(key: string, dto: UpdateContentBlockDto) {
    const block = await this.contentModel.findOne({ key }).exec();
    if (!block) {
      throw new NotFoundException('Content block not found');
    }

    if (dto.label) {
      block.label = dto.label;
    }

    if (typeof dto.description !== 'undefined') {
      block.description = dto.description;
    }

    if (typeof dto.en === 'string') {
      block.content.en = dto.en;
    }

    if (typeof dto.am === 'string') {
      block.content.am = dto.am;
    }

    await block.save();
    return block.toObject();
  }

  async remove(key: string) {
    const result = await this.contentModel
      .findOneAndDelete({ key })
      .lean()
      .exec();
    if (!result) {
      throw new NotFoundException('Content block not found');
    }
    return { message: 'Content block removed' };
  }
}
