import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ClassService } from './class.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EnrolledGuard } from '../auth/guards/enrolled.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { ClassOwnerGuard } from '../auth/guards/class-owner.guard';

@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get()
  @UseGuards(JwtAuthGuard, EnrolledGuard)
  findAll() {
    return this.classService.findAll();
  }

  @Get(':id/access')
  @UseGuards(JwtAuthGuard, EnrolledGuard)
  getAccess(@Param('id') id: string) {
    return this.classService.getAccessPayload(id);
  }

  @Post(':id/materials')
  @Roles('Teacher', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard, ClassOwnerGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      storage: memoryStorage(),
    }),
  )
  async uploadMaterial(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Material file is required');
    }
    const updatedClass = await this.classService.appendMaterial(
      id,
      file,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      title || file.originalname,
    );
    return {
      message: 'Material uploaded successfully',
      materials: updatedClass.materials,
    };
  }
}
