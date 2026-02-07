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
import { ProductModule } from '../product/product.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentRequest.name, schema: PaymentRequestSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    forwardRef(() => ClassModule),
    forwardRef(() => AttendanceModule),
    forwardRef(() => ProductModule),
    AuthModule,
    UserModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}

