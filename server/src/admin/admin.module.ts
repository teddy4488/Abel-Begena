import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Order, OrderSchema } from '../order/schemas/order.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Class, ClassSchema } from '../class/schemas/class.schema';
import {
  StudentAttendanceParticipant,
  StudentAttendanceParticipantSchema,
} from '../attendance/schemas/student-attendance-participant.schema';
import {
  TeacherAttendanceParticipant,
  TeacherAttendanceParticipantSchema,
} from '../attendance/schemas/teacher-attendance-participant.schema';
import {
  StudentAttendance,
  StudentAttendanceSchema,
} from '../attendance/schemas/student-attendance.schema';
import {
  TeacherAttendance,
  TeacherAttendanceSchema,
} from '../attendance/schemas/teacher-attendance.schema';
import {
  StudentPayment,
  StudentPaymentSchema,
} from '../attendance/schemas/student-payment.schema';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: Class.name, schema: ClassSchema },
      {
        name: StudentAttendanceParticipant.name,
        schema: StudentAttendanceParticipantSchema,
      },
      {
        name: TeacherAttendanceParticipant.name,
        schema: TeacherAttendanceParticipantSchema,
      },
      { name: StudentAttendance.name, schema: StudentAttendanceSchema },
      { name: TeacherAttendance.name, schema: TeacherAttendanceSchema },
      { name: StudentPayment.name, schema: StudentPaymentSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
