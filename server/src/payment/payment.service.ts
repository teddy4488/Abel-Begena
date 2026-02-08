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
import { notDeletedFilter } from '../common/filters/not-deleted.filter';
import { MailService } from '../mail/mail.service';
import { UserService } from '../user/user.service';

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
    private readonly mailService: MailService,
    private readonly userService: UserService,
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
        ...notDeletedFilter(),
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
    userId: string,
  ) {
    // userId is the authenticated user's ID (JWT sub). Resolve student and validate.
    let existingPayments;
    try {
      existingPayments = await this.attendanceService.getStudentPayments(userId);
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
    const conversionData = JSON.stringify({ month: dto.month, year: dto.year });
    const existingRequest = await this.paymentModel
      .findOne({
        userId: new Types.ObjectId(userId),
        type: 'student_monthly_fee',
        status: 'pending' as PaymentRequestStatus,
        conversionData,
        ...notDeletedFilter(),
      })
      .lean()
      .exec();

    if (existingRequest) {
      throw new BadRequestException(
        'A pending payment request already exists for this month',
      );
    }

    // Create payment request (userId only; participant resolved on approval)
    const created = await this.paymentModel.create({
      userId: new Types.ObjectId(userId),
      type: 'student_monthly_fee',
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
      .find({ userId: new Types.ObjectId(userId), ...notDeletedFilter() })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async listPending(type?: string) {
    const filter: any = { status: 'pending' as PaymentRequestStatus, ...notDeletedFilter() };
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
    const payment = await this.paymentModel
      .findOne({ _id: dto.id, ...notDeletedFilter() })
      .exec();
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
            // Use approval date as student's registration start so due-date logic is correct
            const approvedAt = payment.reviewedAt || new Date();
            conversionPayload.registrationStartDate =
              typeof approvedAt === 'string'
                ? approvedAt
                : new Date(approvedAt).toISOString().split('T')[0];

            const conversionResult =
              await this.attendanceService.convertUserToStudent(
                payment.userId.toString(),
                conversionPayload,
              );

            // Record the first (enrollment) payment as a StudentPayment so it appears in
            // student payment history and in revenue. Due date = approval date (next due = +30 days).
            if (conversionResult?.student?._id) {
              const approvedAtDate = new Date(approvedAt);
              const approvalYear = approvedAtDate.getFullYear();
              const approvalMonth = approvedAtDate.getMonth() + 1;
              await this.attendanceService.recordStudentPayment(
                {
                  participantId: conversionResult.student._id.toString(),
                  amount: payment.amount,
                  month: approvalMonth,
                  year: approvalYear,
                  status: 'paid',
                  note: 'Initial enrollment payment (approved with receipt).',
                },
                adminUserId,
              );
            }
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
        const order = await this.orderModel
          .findOne({ _id: payment.targetId, ...notDeletedFilter() })
          .exec();
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
        const order = await this.orderModel
          .findOne({ _id: payment.targetId, ...notDeletedFilter() })
          .exec();
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

    // If approved and type is student_monthly_fee, resolve participant by userId and update student payment record
    if (dto.status === 'approved' && payment.type === 'student_monthly_fee') {
      try {
        const participantId =
          await this.attendanceService.getParticipantIdByUserId(
            payment.userId.toString(),
          );
        if (!participantId) {
          // eslint-disable-next-line no-console
          console.warn(
            'Student monthly fee approved but no participant found for user',
            payment.userId.toString(),
          );
        } else {
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

          const next =
            await this.attendanceService.getNextUnpaidDueDateInMonthYear(
              participantId,
              month,
              year,
            );

          await this.attendanceService.recordStudentPayment(
            {
              participantId,
              amount: payment.amount,
              month,
              year,
              status: 'paid',
              period: next?.period,
              note: `Payment approved via receipt submission. ${payment.reviewNote || ''}`.trim(),
              receiptUrl: payment.receiptUrl,
            },
            adminUserId,
          );
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          'Failed to update student payment after monthly fee approval:',
          error,
        );
        // Don't throw - payment is already approved, can be updated manually
      }
    }

    // If rejected and type is student_monthly_fee, log for admin awareness
    if (dto.status === 'rejected' && payment.type === 'student_monthly_fee') {
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
        // eslint-disable-next-line no-console
        console.log(
          `Student monthly payment rejected for user ${payment.userId}, month ${month}/${year}`,
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          'Failed to process student monthly fee rejection:',
          error,
        );
      }
    }

    if (dto.status === 'approved') {
      try {
        const user = await this.userService.findById(payment.userId.toString());
        if (user?.email) {
          const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '';
          await this.mailService.sendPaymentApprovedEmail(
            user.email,
            fullName,
            payment.type,
            payment.amount,
            payment.currency ?? 'ETB',
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to send payment approved email:', e);
      }
    }

    if (dto.status === 'approved') {
      try {
        const user = await this.userService.findById(payment.userId.toString());
        if (user?.email) {
          const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '';
          await this.mailService.sendPaymentApprovedEmail(
            user.email,
            fullName,
            payment.type,
            payment.amount,
            payment.currency ?? 'ETB',
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to send payment approved email:', e);
      }
    }

    return payment.toObject();
  }
}

