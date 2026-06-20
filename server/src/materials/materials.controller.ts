import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
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
import { MAX_VIDEO_SIZE_BYTES } from '../upload/upload.service';
import { RoleGuard } from '../auth/guards/role.guard';
import { ClassService } from '../class/class.service';
import { userMatchesClassTeacher } from '../class/class.constants';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('materials')
export class MaterialsController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly classService: ClassService,
  ) {}

  @Post('upload')
  @Roles('Teacher', 'Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AuditLog({ action: 'material_upload', resource: 'material', resourceIdBody: 'classId' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_VIDEO_SIZE_BYTES },
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

    // A teacher may only upload to classes they actually teach (multi-teacher aware).
    // Admins/SuperAdmins are unrestricted.
    if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
      const klass = await this.classService.findById(dto.classId);
      if (!klass) {
        throw new NotFoundException('Class not found');
      }
      if (!userMatchesClassTeacher(klass, req.user.sub)) {
        throw new ForbiddenException(
          'You can only upload materials to classes you teach',
        );
      }
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
    @Query('classId') classId: string | undefined,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    // Per-class request: reuse class access logic
    // (throws if user is neither admin, instructor, nor active enrollee)
    if (classId) {
      await this.classService.getAccessPayload(classId, {
        sub: req.user.sub,
        role: req.user.role,
      });
      return this.materialsService.getMaterialsByClass(classId);
    }

    // No classId: scope by role so the caller (e.g. student dashboard) can list
    // all materials it has access to without iterating per-class.
    const role = req.user.role;
    if (role === 'Admin' || role === 'SuperAdmin') {
      return this.materialsService.getMaterialsByClass(); // no filter = all
    }
    if (role === 'Student') {
      const enrollments = await this.classService.getStudentEnrollments(
        req.user.sub,
      );
      const classIds = enrollments
        .filter((e) => e.status !== 'withdrawn')
        .map((e) => String(e.classId))
        .filter(Boolean);
      return this.materialsService.getMaterialsByClassIds(classIds);
    }
    if (role === 'Teacher') {
      return this.materialsService.getMaterialsForTeacher(req.user.sub);
    }
    return [];
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
  @AuditLog({ action: 'material_delete', resource: 'material', resourceIdParam: 'id' })
  async deleteMaterial(
    @Param('id') id: string,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    // Admins can delete any material, teachers can only delete their own
    const teacherId = req.user.role === 'Admin' ? '' : req.user.sub;
    return this.materialsService.deleteMaterial(id, teacherId);
  }
}
