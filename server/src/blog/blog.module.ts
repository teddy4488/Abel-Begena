import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogPost, BlogPostSchema } from './schemas/blog-post.schema';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { UploadModule } from '../upload/upload.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlogPost.name, schema: BlogPostSchema },
      { name: Comment.name, schema: CommentSchema },
    ]),
    UploadModule,
    AuthModule,
    UserModule,
  ],
  controllers: [BlogController, CommentController],
  providers: [BlogService, CommentService],
  exports: [BlogService],
})
export class BlogModule {}
