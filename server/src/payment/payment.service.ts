import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PaymentRequest,
  PaymentRequestDocument,
  PaymentRequestStatus,
} from './schemas/payment-request.schema';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { ClassService } from '../class/class.service';
import { AttendanceService } from '../attendance/attendance.service';
import {
  Order,
  OrderDocument,
  OrderStatus,
} from '../order/schemas/order.schema';
import { ProductService } from '../product/product.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(PaymentRequest.name)
    private readonly paymentModel: Model<PaymentRequestDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @Inject(forwardRef(() => ClassService))
    private readonly classService: ClassService,
    @Inject(forwardRef(() => AttendanceService))
    private readonly attendanceService: AttendanceService,
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
  ) {}

  async create(dto: Omit<CreatePaymentRequestDto, 'userId'>, userId: string) {
    // Idempotency: avoid creating duplicates for the same user/type/target while still pending
    const normalizedTargetId = dto.targetId ? new Types.ObjectId(dto.targetId) : undefined;
    const existing = await this.paymentModel
      .findOne({
        userId: new Types.ObjectId(userId),
        type: dto.type,
        ...(normalizedTargetId ? { targetId: normalizedTargetId } : {}),
        status: 'pending' as PaymentRequestStatus,
      })
      .lean()
      .exec();

    if (existing) {
      return existing;
    }

    const created = await this.paymentModel.create({
      userId: new Types.ObjectId(userId),
      type: dto.type,
      targetId: normalizedTargetId,
      amount: dto.amount,
      currency: dto.currency ?? 'ETB',
      method: dto.method,
      reference: dto.reference,
      receiptUrl: dto.receiptUrl,
      status: 'pending' as PaymentRequestStatus,
      reviewNote: dto.reviewNote,
      conversionData: (dto as any).conversionData,
    });
    return created.toObject();
  }

  async listForUser(userId: string) {
    return this.paymentModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async listPending(type?: string) {
    const filter: any = { status: 'pending' as PaymentRequestStatus };
    if (type) {
      filter.type = type;
    }
    return this.paymentModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email')
      .lean()
      .exec();
  }

  async updateStatus(dto: UpdatePaymentStatusDto, adminUserId: string) {
    const payment = await this.paymentModel.findById(dto.id).exec();
    if (!payment) {
      throw new NotFoundException('Payment request not found');
    }
    if (payment.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be updated');
    }

    payment.status = dto.status;
    payment.reviewedBy = new Types.ObjectId(adminUserId);
    payment.reviewedAt = new Date();
    payment.reviewNote = dto.reason;

    await payment.save();

    // If approved and type is enrollment, activate the enrollment
    if (
      dto.status === 'approved' &&
      payment.type === 'enrollment' &&
      payment.targetId
    ) {
      try {
        await this.classService.updateEnrollmentStatus(
          payment.targetId.toString(),
          payment.userId.toString(),
          { status: 'active', note: dto.reason },
          adminUserId,
        );
      } catch (error) {
        // Log error but don't fail the payment update
        // The enrollment might not exist or might already be active
        // eslint-disable-next-line no-console
        console.error(
          'Failed to activate enrollment after payment approval:',
          error,
        );
      }
    }

    // If approved and type is order, mark order as paid
    if (
      dto.status === 'approved' &&
      payment.type === 'order' &&
      payment.targetId
    ) {
      try {
        const order = await this.orderModel.findById(payment.targetId).exec();
        if (order) {
          // If stock wasn't reserved at checkout (bank transfer), reserve it now.
          if (order.status === OrderStatus.PAYMENT_PENDING) {
            for (const item of order.items ?? []) {
              await this.productService.reduceStock(
                item.productId.toString(),
                item.quantity,
              );
            }
          }

          order.isPaid = true;
          order.status = OrderStatus.PROCESSING;
          await order.save();
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          'Failed to mark order as paid after payment approval:',
          error,
        );
      }
    }

    // If approved and type is student_conversion, trigger user-to-student conversion
    if (
      dto.status === 'approved' &&
      payment.type === 'student_conversion' &&
      payment.userId &&
      payment.conversionData
    ) {
      try {
        const conversionData = JSON.parse(payment.conversionData);
        await this.attendanceService.convertUserToStudent(
          payment.userId.toString(),
          conversionData,
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          'Failed to convert user to student after payment approval:',
          error,
        );
        // Don't throw - payment is already approved, conversion can be done manually
      }
    }

    return payment.toObject();
  }
}

