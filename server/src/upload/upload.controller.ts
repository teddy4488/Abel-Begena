import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  UploadService,
  ALLOWED_RECEIPT_MIMES,
  ALLOWED_RECEIPT_EXTENSIONS,
  MAX_RECEIPT_SIZE_BYTES,
} from './upload.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('receipt')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_RECEIPT_SIZE_BYTES },
    }),
  )
  async uploadReceipt(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Receipt file is required');
    }
    const url = await this.uploadService.uploadMaterial(
      file,
      'abel-begena/receipts',
      {
        allowedMimeTypes: [...ALLOWED_RECEIPT_MIMES],
        allowedExtensions: [...ALLOWED_RECEIPT_EXTENSIONS],
        maxSizeBytes: MAX_RECEIPT_SIZE_BYTES,
      },
    );
    return { url };
  }
}

