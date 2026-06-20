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
import { AdvertisementService } from './advertisement.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { MAX_VIDEO_SIZE_BYTES } from '../upload/upload.service';

const MAX_AD_MEDIA_SIZE_BYTES = 50 * 1024 * 1024;

@Controller('advertisements')
export class AdvertisementController {
  constructor(private readonly adService: AdvertisementService) {}

  @Get('active')
  getActive() {
    return this.adService.findActive();
  }

  @Get()
  @Roles('Admin', 'SuperAdmin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getAll() {
    return this.adService.findAll();
  }

  @Post('upload-media')
  @Roles('Admin', 'SuperAdmin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AD_MEDIA_SIZE_BYTES },
    }),
  )
  async uploadMedia(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Media file is required');
    return this.adService.uploadMedia(file);
  }

  @Post()
  @Roles('Admin', 'SuperAdmin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  create(
    @Body() dto: CreateAdvertisementDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.adService.create(dto, req.user.sub);
  }

  @Patch(':id')
  @Roles('Admin', 'SuperAdmin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  update(@Param('id') id: string, @Body() dto: UpdateAdvertisementDto) {
    return this.adService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin', 'SuperAdmin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  remove(@Param('id') id: string) {
    return this.adService.remove(id);
  }
}
