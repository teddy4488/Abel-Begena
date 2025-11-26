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
  UseGuards,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';

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
  getManageList(@Query('search') search?: string) {
    return this.blogService.findAllForManagement(search);
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
  create(
    @Body() dto: CreateBlogPostDto,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    return this.blogService.create(dto, req.user);
  }

  @Patch(':id')
  @Roles('Admin', 'Teacher')
  @UseGuards(JwtAuthGuard, RoleGuard)
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
  remove(
    @Param('id') id: string,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    return this.blogService.remove(id, req.user);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.blogService.findPublishedBySlug(slug);
  }
}
