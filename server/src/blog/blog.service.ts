import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { BlogPost, BlogPostDocument } from './schemas/blog-post.schema';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';

type Actor = {
  sub: string;
  role: string;
};

type BlogAuthor = {
  _id?: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

type BlogPostResponse = Omit<BlogPost, 'author'> & {
  _id: Types.ObjectId;
  author?: BlogAuthor | Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  publishedAt?: Date;
};

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(BlogPost.name)
    private readonly blogModel: Model<BlogPostDocument>,
  ) {}

  async create(
    dto: CreateBlogPostDto,
    actor: Actor,
  ): Promise<BlogPostResponse> {
    const slug = await this.generateUniqueSlug(dto.slug ?? dto.title);
    const isAdmin = actor.role === 'Admin';
    const status: 'draft' | 'pending' | 'published' =
      isAdmin && dto.isPublished
        ? 'published'
        : isAdmin && dto.status
          ? dto.status
          : actor.role === 'Teacher'
            ? 'pending'
            : 'draft';
    const post = await this.blogModel.create({
      ...dto,
      slug,
      author: new Types.ObjectId(actor.sub),
      isPublished: status === 'published',
      status,
      ...(status === 'published' ? { publishedAt: new Date() } : {}),
    });
    return this.populateAndFormat(post);
  }

  async findPublished(search?: string): Promise<BlogPostResponse[]> {
    const query: FilterQuery<BlogPostDocument> = {
      isPublished: true,
      status: 'published',
    };
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ title: regex }, { content: regex }];
    }
    const posts = await this.blogModel
      .find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .populate('author', 'firstName lastName role email')
      .lean()
      .exec();
    return posts as BlogPostResponse[];
  }

  async findPublishedBySlug(slug: string): Promise<BlogPostResponse> {
    const post = await this.blogModel
      .findOne({ slug, isPublished: true, status: 'published' })
      .populate('author', 'firstName lastName role email')
      .lean()
      .exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post as BlogPostResponse;
  }

  async findAllForManagement(search?: string): Promise<BlogPostResponse[]> {
    const query: FilterQuery<BlogPostDocument> = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ title: regex }, { content: regex }];
    }

    const posts = await this.blogModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate('author', 'firstName lastName role email')
      .lean()
      .exec();

    return posts as BlogPostResponse[];
  }

  async findOneForManagement(id: string): Promise<BlogPostResponse> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid blog id');
    }

    const post = await this.blogModel
      .findById(id)
      .populate('author', 'firstName lastName role email')
      .lean()
      .exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post as BlogPostResponse;
  }

  async update(
    id: string,
    dto: UpdateBlogPostDto,
    actor: Actor,
  ): Promise<BlogPostResponse> {
    const post = await this.blogModel.findById(id).exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    this.assertCanModify(post, actor);

    if (dto.title) {
      post.title = dto.title;
    }

    if (typeof dto.content !== 'undefined') {
      post.content = dto.content;
    }

    if (dto.coverImage) {
      post.coverImage = dto.coverImage;
    }

    if (dto.slug) {
      post.slug = await this.generateUniqueSlug(dto.slug, post._id);
    }

    // Only admins can publish/approve
    if (actor.role === 'Admin') {
      if (typeof dto.isPublished === 'boolean') {
        post.isPublished = dto.isPublished;
      }
      if (dto.status) {
        post.status = dto.status;
      }
      if (
        (dto.isPublished === true || dto.status === 'published') &&
        !post.publishedAt
      ) {
        post.publishedAt = new Date();
      }
      if (dto.isPublished === false || dto.status === 'draft') {
        post.publishedAt = undefined;
      }
    } else {
      // Teachers cannot publish directly
      post.isPublished = false;
      post.status = 'pending';
      post.publishedAt = undefined;
    }

    await post.save();
    return this.populateAndFormat(post);
  }

  async remove(id: string, actor: Actor): Promise<{ message: string }> {
    const post = await this.blogModel.findById(id).exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    this.assertCanModify(post, actor, true);

    await post.deleteOne();
    return { message: 'Post deleted' };
  }

  private assertCanModify(
    post: BlogPostDocument,
    actor: Actor,
    deleting = false,
  ) {
    if (actor.role === 'Admin') {
      return;
    }

    const isOwner = post.author?.toString?.() === actor.sub?.toString?.();

    if (!isOwner) {
      throw new ForbiddenException(
        deleting
          ? 'You can only delete posts that you authored'
          : 'You can only edit posts that you authored',
      );
    }
  }

  private async generateUniqueSlug(
    input: string,
    currentId?: Types.ObjectId,
  ): Promise<string> {
    const base = this.slugify(input);
    if (!base) {
      throw new BadRequestException('Unable to derive slug from input');
    }

    let slug = base;
    let counter = 1;

    while (true) {
      const existing = await this.blogModel
        .findOne({
          slug,
          ...(currentId ? { _id: { $ne: currentId } } : {}),
        })
        .lean()
        .exec();

      if (!existing) {
        return slug;
      }

      counter += 1;
      slug = `${base}-${counter}`;
    }
  }

  private slugify(value: string): string {
    return value
      ?.toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async populateAndFormat(
    post: BlogPostDocument,
  ): Promise<BlogPostResponse> {
    const populated = await post.populate(
      'author',
      'firstName lastName role email',
    );
    return populated.toObject() as BlogPostResponse;
  }
}
