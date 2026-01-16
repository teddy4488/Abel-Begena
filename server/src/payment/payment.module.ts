import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import {
  PaymentRequest,
  PaymentRequestSchema,
} from './schemas/payment-request.schema';
import { ClassModule } from '../class/class.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { Order, OrderSchema } from '../order/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentRequest.name, schema: PaymentRequestSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    forwardRef(() => ClassModule),
    forwardRef(() => AttendanceModule),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}

