import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadMaterial(
    file: Express.Multer.File,
    folder = 'abel-begena/materials',
  ): Promise<string> {
    if (!file) {
      throw new InternalServerErrorException('No file provided');
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

