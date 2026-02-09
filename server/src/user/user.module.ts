import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AdminTeacherController } from './admin-teacher.controller';
import { AdminAdminsController } from './admin-admins.controller';
import { User, UserSchema } from './schemas/user.schema';
import { UploadModule } from '../upload/upload.module';
import { AuthModule } from '../auth/auth.module';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    UploadModule,
    forwardRef(() => AuthModule),
    forwardRef(() => AttendanceModule),
  ],
  providers: [UserService],
  controllers: [UserController, AdminTeacherController, AdminAdminsController],
  exports: [UserService],
})
export class UserModule {}
