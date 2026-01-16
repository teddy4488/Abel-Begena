import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { MaterialsService } from './materials.service';
import { CreateInstrumentMaterialDto } from './dto/create-instrument-material.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { InstrumentType } from '../product/schemas/product.schema';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post('upload')
  @Roles('Teacher', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadMaterial(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateInstrumentMaterialDto,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    if (!file) {
      throw new BadRequestException('Material file is required');
    }

    return this.materialsService.uploadMaterial(
      file,
      dto.title,
      dto.instrumentType,
      req.user.sub,
      dto.description,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getMaterials(
    @Query('instrumentType') instrumentType?: InstrumentType,
    @Request() req?: { user: { sub: string; role: string } },
  ) {
    // If user is a student, filter by their instrument type
    // If user is teacher/admin, they can see all or filter by instrument type
    return this.materialsService.getMaterialsByInstrument(instrumentType);
  }

  @Get('teacher')
  @Roles('Teacher', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  async getTeacherMaterials(@Request() req: { user: { sub: string } }) {
    return this.materialsService.getMaterialsForTeacher(req.user.sub);
  }

  @Delete(':id')
  @Roles('Teacher', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  async deleteMaterial(
    @Param('id') id: string,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    // Admins can delete any material, teachers can only delete their own
    const teacherId = req.user.role === 'Admin' ? '' : req.user.sub;
    return this.materialsService.deleteMaterial(id, teacherId);
  }
}
