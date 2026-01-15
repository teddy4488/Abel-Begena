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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: Class.name, schema: ClassSchema },
      {
        name: StudentAttendanceParticipant.name,
        schema: StudentAttendanceParticipantSchema,
      },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
