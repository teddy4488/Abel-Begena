import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

/** MIME types allowed for images (avatars, covers, product images) */
export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/** File extensions allowed for images */
export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
] as const;

/** MIME types for receipts and materials (images + PDF) */
export const ALLOWED_RECEIPT_MIMES = [
  ...ALLOWED_IMAGE_MIMES,
  'application/pdf',
] as const;

/** File extensions for receipts and materials */
export const ALLOWED_RECEIPT_EXTENSIONS = [
  ...ALLOWED_IMAGE_EXTENSIONS,
  '.pdf',
] as const;

/** MIME types allowed for video materials. */
export const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

/** File extensions allowed for video materials. */
export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'] as const;

/** Lesson materials: images + PDF + video. */
export const ALLOWED_MATERIAL_MIMES = [
  ...ALLOWED_RECEIPT_MIMES,
  ...ALLOWED_VIDEO_MIMES,
] as const;

export const ALLOWED_MATERIAL_EXTENSIONS = [
  ...ALLOWED_RECEIPT_EXTENSIONS,
  ...ALLOWED_VIDEO_EXTENSIONS,
] as const;

/** Default max size for images (e.g. avatars, covers): 5MB */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/** Default max size for receipts/materials: 10MB */
export const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024;

/** Max size for video materials: 100MB (mind Cloudinary free-tier limits). */
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

export interface UploadValidationOptions {
  allowedMimeTypes: readonly string[];
  allowedExtensions: readonly string[];
  maxSizeBytes?: number;
}

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  validateFile(
    file: Express.Multer.File,
    options: UploadValidationOptions,
  ): void {
    const { allowedMimeTypes, allowedExtensions, maxSizeBytes } = options;
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${allowedMimeTypes.join(', ')}`,
      );
    }
    const ext = file.originalname
      ? `.${file.originalname.split('.').pop()?.toLowerCase() ?? ''}`
      : '';
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`,
      );
    }
    if (maxSizeBytes != null && file.size > maxSizeBytes) {
      throw new BadRequestException(
        `File too large. Maximum size: ${Math.round(maxSizeBytes / 1024 / 1024)}MB`,
      );
    }
  }

  async uploadMaterial(
    file: Express.Multer.File,
    folder = 'abel-begena/materials',
    validation?: UploadValidationOptions,
  ): Promise<string> {
    if (!file) {
      throw new InternalServerErrorException('No file provided');
    }
    if (validation) {
      this.validateFile(file, validation);
    }

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error || !result) {
            return reject(
              new InternalServerErrorException('Failed to upload material'),
            );
          }

          resolve(result.secure_url);
        },
      );

      upload.end(file.buffer);
    });
  }
}
