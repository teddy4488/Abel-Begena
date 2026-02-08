import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { CreateUserDto } from './dto/create-user.dto';
import {
  UploadService,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_IMAGE_SIZE_BYTES,
} from '../upload/upload.service';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly uploadService: UploadService,
  ) {}

  @Get()
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  findAll() {
    return this.userService.findAll();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@Request() req: { user: { sub: string; role: string } }) {
    return this.userService.findById(req.user.sub);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Request() req: { user: { sub: string } },
    @Body() dto: UpdateUserDto,
  ) {
    const payload: UpdateUserDto = {};
    if (typeof dto.firstName !== 'undefined') {
      payload.firstName = dto.firstName;
    }
    if (typeof dto.lastName !== 'undefined') {
      payload.lastName = dto.lastName;
    }
    if (typeof dto.phone !== 'undefined') {
      payload.phone = dto.phone;
    }
    if (typeof dto.avatarUrl !== 'undefined') {
      payload.avatarUrl = dto.avatarUrl;
    }
    if (typeof dto.bio !== 'undefined') {
      payload.bio = dto.bio;
    }
    if (typeof dto.languagePreference !== 'undefined') {
      payload.languagePreference = dto.languagePreference;
    }
    return this.userService.update(req.user.sub, payload);
  }

  @Post('profile/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadOwnAvatar(
    @Request() req: { user: { sub: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }
    const avatarUrl = await this.uploadService.uploadMaterial(
      file,
      'abel-begena/avatars',
      {
        allowedMimeTypes: [...ALLOWED_IMAGE_MIMES],
        allowedExtensions: [...ALLOWED_IMAGE_EXTENSIONS],
        maxSizeBytes: MAX_IMAGE_SIZE_BYTES,
      },
    );
    await this.userService.update(req.user.sub, { avatarUrl });
    return { avatarUrl };
  }

  @Post(':id/avatar')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AuditLog({ action: 'user_avatar', resource: 'user', resourceIdParam: 'id' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadAvatarForUser(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }
    const avatarUrl = await this.uploadService.uploadMaterial(
      file,
      'abel-begena/avatars',
      {
        allowedMimeTypes: [...ALLOWED_IMAGE_MIMES],
        allowedExtensions: [...ALLOWED_IMAGE_EXTENSIONS],
        maxSizeBytes: MAX_IMAGE_SIZE_BYTES,
      },
    );
    await this.userService.update(id, { avatarUrl });
    return { avatarUrl };
  }

  @Get(':id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Post()
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AuditLog({ action: 'user_create', resource: 'user' })
  create(@Body() dto: CreateUserDto) {
    // Only allow creating website users (role: 'User')
    // Teachers and Admins must be created through their respective endpoints
    if (dto.role && dto.role !== 'User') {
      throw new Error(
        'Cannot create teachers or admins through this endpoint. Use /admin/teachers or /admin/admins endpoints instead.',
      );
    }
    return this.userService.create({ ...dto, role: 'User' });
  }

  @Patch(':id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AuditLog({ action: 'user_update', resource: 'user', resourceIdParam: 'id' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AuditLog({ action: 'user_remove', resource: 'user', resourceIdParam: 'id' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
