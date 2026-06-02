import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { MAX_IMAGE_SIZE_BYTES } from '../upload/upload.service';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  getPublished(@Query('search') search?: string) {
    return this.blogService.findPublished(search);
  }

  @Get('manage/list')
  @Roles('Admin', 'Teacher')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getManageList(
    @Request() req: { user: { sub: string; role: string } },
    @Query('search') search?: string,
  ) {
    return this.blogService.findAllForManagement(search, req.user);
  }

  @Get('manage/:id')
  @Roles('Admin', 'Teacher')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getManageDetail(@Param('id') id: string) {
    return this.blogService.findOneForManagement(id);
  }

  @Post()
  @Roles('Admin', 'Teacher')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AuditLog({ action: 'blog_create', resource: 'blog' })
  create(
    @Body() dto: CreateBlogPostDto,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    return this.blogService.create(dto, req.user);
  }

  @Patch(':id')
  @Roles('Admin', 'Teacher')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AuditLog({ action: 'blog_update', resource: 'blog', resourceIdParam: 'id' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBlogPostDto,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    return this.blogService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles('Admin', 'Teacher')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AuditLog({ action: 'blog_delete', resource: 'blog', resourceIdParam: 'id' })
  remove(
    @Param('id') id: string,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    return this.blogService.remove(id, req.user);
  }

  @Post('upload-image')
  @Roles('Admin', 'Teacher')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    const imageUrl = await this.blogService.uploadCoverImage(file);
    return { imageUrl };
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.blogService.findPublishedBySlug(slug);
  }
}
