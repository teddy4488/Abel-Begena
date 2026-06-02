import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { BlogPost } from './schemas/blog-post.schema';
import { UpdateCommentStatusDto } from './dto/update-comment-status.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { notDeletedFilter } from '../common/filters/not-deleted.filter';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,
  ) {}

  async create(
    postId: string,
    authorId: string,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post id');
    }
    if (!Types.ObjectId.isValid(authorId)) {
      throw new BadRequestException('Invalid user id');
    }
    const created = await this.commentModel.create({
      postId: new Types.ObjectId(postId),
      authorId: new Types.ObjectId(authorId),
      content: dto.content,
      status: 'pending', // Pending admin approval before appearing publicly
    });
    return created.toObject();
  }

  async listPublicForPost(postId: string) {
    return this.commentModel
      .find({
        postId: new Types.ObjectId(postId),
        status: 'approved',
        ...notDeletedFilter(),
      })
      .sort({ createdAt: -1 })
      .populate('authorId', 'firstName lastName email avatarUrl')
      .lean()
      .exec();
  }

  async listManage(search?: string) {
    const query: Record<string, unknown> = {
      $and: [
        notDeletedFilter(),
        ...(search ? [{ $or: [{ content: new RegExp(search, 'i') }] }] : []),
      ],
    };
    return this.commentModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate('postId', 'title slug status isPublished')
      .populate('authorId', 'firstName lastName email')
      .lean()
      .exec();
  }

  async updateStatus(id: string, dto: UpdateCommentStatusDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comment id');
    }
    const updated = await this.commentModel
      .findOneAndUpdate(
        { _id: id, ...notDeletedFilter() },
        {
          status: dto.status,
          ...(dto.note ? { note: dto.note } : {}),
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Comment not found');
    }

    return updated;
  }

  async update(id: string, userId: string, dto: UpdateCommentDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comment id');
    }
    const comment = await this.commentModel
      .findOne({ _id: id, ...notDeletedFilter() })
      .lean()
      .exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }
    const updated = await this.commentModel
      .findByIdAndUpdate(
        id,
        { content: dto.content },
        { new: true },
      )
      .lean()
      .exec();
    return updated;
  }

  async remove(id: string, userId?: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comment id');
    }
    const notDeleted = { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
    const comment = await this.commentModel
      .findOne({ _id: id, ...notDeleted })
      .lean()
      .exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (userId && comment.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.commentModel.findByIdAndUpdate(id, { deletedAt: new Date() }).exec();
    return { message: 'Comment removed' };
  }

  async softDeleteByPostId(postId: string): Promise<{ message: string; deletedCount: number }> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post id');
    }
    const notDeleted = { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
    const result = await this.commentModel
      .updateMany(
        { postId: new Types.ObjectId(postId), ...notDeleted },
        { deletedAt: new Date() },
      )
      .exec();
    return {
      message: `${result.modifiedCount} comments deleted for post ${postId}`,
      deletedCount: result.modifiedCount,
    };
  }

  /** @deprecated Use softDeleteByPostId instead. Kept for backward compatibility. */
  async deleteByPostId(postId: string): Promise<{ message: string; deletedCount: number }> {
    return this.softDeleteByPostId(postId);
  }
}
