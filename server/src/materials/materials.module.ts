import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import {
  InstrumentMaterial,
  InstrumentMaterialSchema,
} from './schemas/instrument-material.schema';
import { UploadModule } from '../upload/upload.module';
import { Class, ClassSchema } from '../class/schemas/class.schema';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InstrumentMaterial.name, schema: InstrumentMaterialSchema },
      { name: Class.name, schema: ClassSchema },
    ]),
    UploadModule,
    AuthModule,
    UserModule,
  ],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
