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

  @Prop()
  publishedAt?: Date;
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPost);

BlogPostSchema.pre<BlogPostDocument>('save', function handlePublished(next) {
  if (this.isModified('isPublished')) {
    if (this.isPublished && !this.publishedAt) {
      this.publishedAt = new Date();
    }
    if (!this.isPublished) {
      this.publishedAt = undefined;
    }
  }
  next();
});
