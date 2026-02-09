import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

export type CreateNotificationInput = {
  type: string;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
};

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async createForUser(userId: string, input: CreateNotificationInput) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid userId for notification');
    }
    const created = await this.notificationModel.create({
      userId: new Types.ObjectId(userId),
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data,
    });
    return created.toObject();
  }

  async listForUser(userId: string, limit = 50) {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async markAsRead(userId: string, notificationId: string) {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(notificationId)) {
      return null;
    }
    const updated = await this.notificationModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(notificationId),
          userId: new Types.ObjectId(userId),
        },
        { readAt: new Date() },
        { new: true },
      )
      .lean()
      .exec();
    return updated;
  }
}

