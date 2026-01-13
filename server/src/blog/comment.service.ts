import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { BlogPost } from './schemas/blog-post.schema';
import { UpdateCommentStatusDto } from './dto/update-comment-status.dto';

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
      status: 'pending',
    });
    return created.toObject();
  }

  async listPublicForPost(postId: string) {
    return this.commentModel
      .find({
        postId: new Types.ObjectId(postId),
        status: 'approved',
      })
      .sort({ createdAt: -1 })
      .populate('authorId', 'firstName lastName email avatarUrl')
      .lean()
      .exec();
  }

  async listManage(search?: string) {
    const query: Record<string, unknown> = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ content: regex }];
    }
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
      .findByIdAndUpdate(
        id,
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

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comment id');
    }
    const removed = await this.commentModel.findByIdAndDelete(id).lean().exec();
    if (!removed) {
      throw new NotFoundException('Comment not found');
    }
    return { message: 'Comment removed' };
  }
}
