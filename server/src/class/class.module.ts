import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { Class, ClassSchema } from './schemas/class.schema';
import { UploadModule } from '../upload/upload.module';
import { ClassOwnerGuard } from '../auth/guards/class-owner.guard';
import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from '../payment/payment.module';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Class.name, schema: ClassSchema }]),
    UploadModule,
    AuthModule,
    forwardRef(() => PaymentModule),
    AttendanceModule, // Import for lesson management
  ],
  providers: [ClassService, ClassOwnerGuard],
  controllers: [ClassController],
  exports: [ClassService],
})
export class ClassModule {}
