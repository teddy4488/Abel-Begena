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
import { ClassService } from '../class/class.service';

@Controller('materials')
export class MaterialsController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly classService: ClassService,
  ) {}

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
      dto.classId,
      req.user.sub,
      dto.description,
      dto.lessonId,
    );
  }

  /** List instrument materials for a class. Includes both class-scoped and lesson-scoped materials.
   *  Access control:
   *   - Admins can access any class.
   *   - Teachers can access classes they instruct.
   *   - Students must be actively enrolled in the class.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getMaterials(
    @Query('classId') classId: string,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    // Reuse class access logic (throws if user is neither admin, instructor, nor active enrollee)
    await this.classService.getAccessPayload(classId, {
      sub: req.user.sub,
      role: req.user.role,
    });
    return this.materialsService.getMaterialsByClass(classId);
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
