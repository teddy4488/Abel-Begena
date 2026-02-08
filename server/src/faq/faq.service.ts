import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { Faq, FaqDocument } from './schemas/faq.schema';
import { notDeletedFilter } from '../common/filters/not-deleted.filter';

@Injectable()
export class FaqService {
  constructor(
    @InjectModel(Faq.name)
    private readonly faqModel: Model<FaqDocument>,
  ) {}

  findPublic() {
    return this.faqModel
      .find({ isActive: true, ...notDeletedFilter() })
      .sort({ order: 1, createdAt: 1 })
      .lean()
      .exec();
  }

  findAll() {
    return this.faqModel
      .find(notDeletedFilter())
      .sort({ order: 1, createdAt: 1 })
      .lean()
      .exec();
  }

  async create(dto: CreateFaqDto) {
    const created = await this.faqModel.create({
      question: dto.question,
      answer: dto.answer,
      order: typeof dto.order === 'number' ? dto.order : 0,
      isActive: typeof dto.isActive === 'boolean' ? dto.isActive : true,
    });
    return created.toObject();
  }

  async update(id: string, dto: UpdateFaqDto) {
    const notDeleted = notDeletedFilter();
    const updated = await this.faqModel
      .findOneAndUpdate(
        { _id: id, ...notDeleted },
        {
          ...(dto.question ? { question: dto.question } : {}),
          ...(dto.answer ? { answer: dto.answer } : {}),
          ...(typeof dto.order === 'number' ? { order: dto.order } : {}),
          ...(typeof dto.isActive === 'boolean'
            ? { isActive: dto.isActive }
            : {}),
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('FAQ not found');
    }

    return updated;
  }

  async remove(id: string) {
    const notDeleted = { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
    const updated = await this.faqModel
      .findOneAndUpdate(
        { _id: id, ...notDeleted },
        { deletedAt: new Date(), isActive: false },
        { new: true },
      )
      .lean()
      .exec();
    if (!updated) {
      throw new NotFoundException('FAQ not found');
    }
    return { message: 'FAQ removed' };
  }
}
