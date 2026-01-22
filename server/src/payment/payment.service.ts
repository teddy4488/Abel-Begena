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

  async submitStudentMonthlyPayment(
    dto: import('./dto/submit-student-monthly-payment.dto').SubmitStudentMonthlyPaymentDto,
    studentParticipantId: string,
  ) {
    // Verify student exists by checking if they have payment records
    // (this validates the student participant ID)
    let existingPayments;
    try {
      existingPayments = await this.attendanceService.getStudentPayments(studentParticipantId);
    } catch (error) {
      throw new NotFoundException('Student not found');
    }

    // Check if payment already exists and is paid for this month/year
    const hasPaidPaymentForMonth = existingPayments.some(
      (p) => p.year === dto.year && p.month === dto.month && p.status === 'paid',
    );

    if (hasPaidPaymentForMonth) {
      throw new BadRequestException(
        'Payment for this month has already been recorded as paid',
      );
    }

    // Check for existing pending payment request
    const existingRequest = await this.paymentModel
      .findOne({
        userId: new Types.ObjectId(studentParticipantId),
        type: 'student_monthly_fee',
        targetId: new Types.ObjectId(studentParticipantId),
        status: 'pending' as PaymentRequestStatus,
        conversionData: JSON.stringify({ month: dto.month, year: dto.year }),
      })
      .lean()
      .exec();

    if (existingRequest) {
      throw new BadRequestException(
        'A pending payment request already exists for this month',
      );
    }

    // Create payment request
    const conversionData = JSON.stringify({
      month: dto.month,
      year: dto.year,
    });

    const created = await this.paymentModel.create({
      userId: new Types.ObjectId(studentParticipantId),
      type: 'student_monthly_fee',
      targetId: new Types.ObjectId(studentParticipantId),
      amount: dto.amount,
      currency: 'ETB',
      method: 'offline',
      reference: dto.reference,
      receiptUrl: dto.receiptUrl,
      status: 'pending' as PaymentRequestStatus,
      reviewNote: dto.reviewNote,
      conversionData,
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

        // If enrollment has conversionData, trigger user-to-student conversion
        if (payment.conversionData) {
          try {
            const conversionPayload = JSON.parse(payment.conversionData);
            await this.attendanceService.convertUserToStudent(
              payment.userId.toString(),
              conversionPayload,
            );
          } catch (conversionError) {
            // eslint-disable-next-line no-console
            console.error(
              'Failed to convert user to student after enrollment approval:',
              conversionError,
            );
            // Don't throw - enrollment is approved, conversion can be done manually
          }
        }
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
          // If stock wasn't reserved at checkout (offline payments), reserve it now.
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

    // If rejected and type is order, mark order as payment rejected (still unpaid)
    if (
      dto.status === 'rejected' &&
      payment.type === 'order' &&
      payment.targetId
    ) {
      try {
        const order = await this.orderModel.findById(payment.targetId).exec();
        if (order) {
          order.isPaid = false;
          order.status = OrderStatus.PAYMENT_REJECTED;
          await order.save();
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          'Failed to mark order as payment rejected after payment rejection:',
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

    // If approved and type is student_monthly_fee, update student payment record
    if (
      dto.status === 'approved' &&
      payment.type === 'student_monthly_fee' &&
      payment.targetId
    ) {
      try {
        // Parse payment metadata from conversionData (stored as JSON string)
        let month: number;
        let year: number;
        if (payment.conversionData) {
          const metadata = JSON.parse(payment.conversionData);
          month = metadata.month;
          year = metadata.year;
        } else {
          // Fallback: use current month/year if not provided
          const now = new Date();
          month = now.getMonth() + 1;
          year = now.getFullYear();
        }

        // Update student payment record
        await this.attendanceService.recordStudentPayment(
          {
            participantId: payment.targetId.toString(),
            amount: payment.amount,
            month,
            year,
            status: 'paid',
            note: `Payment approved via receipt submission. ${payment.reviewNote || ''}`.trim(),
          },
          adminUserId,
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          'Failed to update student payment after monthly fee approval:',
          error,
        );
        // Don't throw - payment is already approved, can be updated manually
      }
    }

    // If rejected and type is student_monthly_fee, optionally mark payment as unpaid
    if (
      dto.status === 'rejected' &&
      payment.type === 'student_monthly_fee' &&
      payment.targetId
    ) {
      try {
        let month: number;
        let year: number;
        if (payment.conversionData) {
          const metadata = JSON.parse(payment.conversionData);
          month = metadata.month;
          year = metadata.year;
        } else {
          const now = new Date();
          month = now.getMonth() + 1;
          year = now.getFullYear();
        }

        // Optionally update payment status to unpaid (or leave as is)
        // For now, we'll just log it - the admin can manually update if needed
        // eslint-disable-next-line no-console
        console.log(
          `Student monthly payment rejected for participant ${payment.targetId}, month ${month}/${year}`,
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          'Failed to process student monthly fee rejection:',
          error,
        );
      }
    }

    return payment.toObject();
  }
}

