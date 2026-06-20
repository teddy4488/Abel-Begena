import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdvertisementController } from './advertisement.controller';
import { AdvertisementService } from './advertisement.service';
import {
  Advertisement,
  AdvertisementSchema,
} from './schemas/advertisement.schema';
import { UploadModule } from '../upload/upload.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Advertisement.name, schema: AdvertisementSchema },
    ]),
    UploadModule,
    AuthModule,
    UserModule,
  ],
  controllers: [AdvertisementController],
  providers: [AdvertisementService],
})
export class AdvertisementModule {}
