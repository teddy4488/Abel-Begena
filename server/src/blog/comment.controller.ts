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
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { UpdateCommentStatusDto } from './dto/update-comment-status.dto';

@Controller('blog')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get(':slug/comments')
  getPublicComments(
    @Param('slug') slug: string,
    @Query('postId') postId: string,
  ) {
    // Prefer postId for direct lookup; slug is kept for route semantics
    return this.commentService.listPublicForPost(postId);
  }

  @Post(':slug/comments')
  @UseGuards(JwtAuthGuard)
  createComment(
    @Param('slug') slug: string,
    @Query('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.commentService.create(postId, req.user.sub, dto);
  }

  @Get('comments/manage')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getManageList(@Query('search') search?: string) {
    return this.commentService.listManage(search);
  }

  @Patch('comments/:id/status')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCommentStatusDto,
  ) {
    return this.commentService.updateStatus(id, dto);
  }

  @Delete('comments/:id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  remove(@Param('id') id: string) {
    return this.commentService.remove(id);
  }
}
