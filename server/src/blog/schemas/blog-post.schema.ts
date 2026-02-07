import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BlogPostDocument = BlogPost & Document;

@Schema({ timestamps: true })
export class BlogPost {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  slug: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ required: true })
  coverImage: string;

  @Prop({ default: false })
  isPublished: boolean;

  @Prop({
    type: String,
    enum: ['draft', 'pending', 'published'],
    default: 'draft',
  })
  status: 'draft' | 'pending' | 'published';

  @Prop()
  publishedAt?: Date;

  @Prop({ type: Date, required: false, default: null })
  deletedAt?: Date | null;
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPost);

BlogPostSchema.pre<BlogPostDocument>('save', function handlePublished(next) {
  // Keep publishedAt consistent with publishing state
  if (this.isModified('status') || this.isModified('isPublished')) {
    const shouldPublish =
      this.status === 'published' || this.isPublished === true;
    this.isPublished = shouldPublish;
    if (shouldPublish && !this.publishedAt) {
      this.publishedAt = new Date();
    }
    if (!shouldPublish) {
      this.publishedAt = undefined;
    }
  }
  next();
});
