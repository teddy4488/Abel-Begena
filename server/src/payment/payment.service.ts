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
import { CreatePaymentRequestBodyDto } from './dto/create-payment-request-body.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { ClassService } from '../class/class.service';
import { AttendanceService } from '../attendance/attendance.service';
import {
  Order,
  OrderDocument,
  OrderStatus,
  isStockReserved,
} from '../order/schemas/order.schema';
import { ProductService } from '../product/product.service';
import { notDeletedFilter } from '../common/filters/not-deleted.filter';
import { MailService } from '../mail/mail.service';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notifications/notification.service';

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
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Notify all admins only when a stock reduction crossed the low-stock
   * threshold (avoids spamming on every reduction). Best-effort.
   */
  private async notifyLowStock(
    product: {
      _id?: unknown;
      name?: string;
      stock?: number;
      lowStockThreshold?: number;
    },
    reducedBy: number,
  ): Promise<void> {
    try {
      const threshold = product?.lowStockThreshold ?? 0;
      const stock = product?.stock ?? 0;
      const previousStock = stock + reducedBy;
      if (threshold <= 0 || stock > threshold || previousStock <= threshold) return;
      const admins = await this.userService.findAdmins();
      await Promise.all(
        admins.map((admin) => {
          const adminId = (admin as { _id?: { toString: () => string } })._id?.toString();
          if (!adminId) return Promise.resolve();
          return this.notificationService
            .createForUser(adminId, {
              type: 'low_stock',
              title: 'Low stock alert',
              message: `${product.name ?? 'A product'} is low on stock (${stock} left).`,
              data: { productId: product._id, stock, threshold },
            })
            .catch(() => undefined);
        }),
      );
    } catch {
      // best-effort; never block payment approval
    }
  }

  async create(dto: CreatePaymentRequestBodyDto, userId: string) {
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
      conversionData: dto.conversionData,
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

    if (dto.status === 'approved') {
      await this.applyApprovalSideEffects(payment, adminUserId, dto.reason);
    } else if (dto.status === 'rejected') {
      await this.applyRejectionSideEffects(payment, dto.reason);
    }

    return payment.toObject();
  }

  /**
   * Admin repair: re-run the post-approval side effects for an already-approved request.
   * Idempotent — enrollment activation, conversion, and the ledger write all upsert.
   */
  async retrySideEffects(id: string, adminUserId: string) {
    const payment = await this.paymentModel
      .findOne({ _id: id, ...notDeletedFilter() })
      .exec();
    if (!payment) {
      throw new NotFoundException('Payment request not found');
    }
    if (payment.status !== 'approved') {
      throw new BadRequestException(
        'Only approved payments can have their side effects retried',
      );
    }
    await this.applyApprovalSideEffects(payment, adminUserId, payment.reviewNote);
    return payment.toObject();
  }

  /**
   * Apply the side effects of an approved payment. Each effect is wrapped so a failure
   * never rolls back the approval; instead admins are alerted and can retry. Idempotent.
   */
  private async applyApprovalSideEffects(
    payment: PaymentRequestDocument,
    adminUserId: string,
    reason?: string,
  ): Promise<void> {
    // 1) Enrollment → activate + convert user→student + record the initial (period 1) payment.
    if (payment.type === 'enrollment' && payment.targetId) {
      try {
        await this.classService.updateEnrollmentStatus(
          payment.targetId.toString(),
          payment.userId.toString(),
          { status: 'active', note: reason },
          adminUserId,
        );

        if (payment.conversionData) {
          const conversionPayload = JSON.parse(payment.conversionData);
          const approvedAt = payment.reviewedAt || new Date();
          conversionPayload.registrationStartDate = new Date(approvedAt)
            .toISOString()
            .split('T')[0];
          // Capture the agreed monthly fee from the payment amount if not already set.
          if (
            conversionPayload.amount == null ||
            conversionPayload.amount === 0
          ) {
            conversionPayload.amount = payment.amount;
          }

          // Resolve an existing participant (idempotent retry) before converting.
          let participantId =
            await this.attendanceService.getParticipantIdByUserId(
              payment.userId.toString(),
            );
          if (!participantId) {
            const conversionResult =
              await this.attendanceService.convertUserToStudent(
                payment.userId.toString(),
                conversionPayload,
              );
            participantId = conversionResult?.student?._id?.toString() ?? null;
          }

          if (participantId) {
            // Initial enrollment payment is always billing period 1 (idempotent upsert).
            await this.attendanceService.recordStudentPayment(
              {
                participantId,
                amount: payment.amount,
                status: 'paid',
                period: 1,
                note: 'Initial enrollment payment (approved with receipt).',
                receiptUrl: payment.receiptUrl,
              },
              adminUserId,
            );
          }
        }
      } catch (error) {
        await this.notifyAdminsSideEffectFailure(
          payment,
          'enrollment/conversion',
          error,
        );
      }
    }

    // 2) Order → reserve stock if needed + mark paid/processing.
    if (payment.type === 'order' && payment.targetId) {
      try {
        const order = await this.orderModel
          .findOne({ _id: payment.targetId, ...notDeletedFilter() })
          .exec();
        if (order && !order.isPaid) {
          if (order.status === OrderStatus.PAYMENT_PENDING) {
            for (const item of order.items ?? []) {
              const updatedProduct = await this.productService.reduceStock(
                item.productId.toString(),
                item.quantity,
              );
              await this.notifyLowStock(updatedProduct, item.quantity);
            }
          }
          order.isPaid = true;
          order.status = OrderStatus.PROCESSING;
          await order.save();
        }
      } catch (error) {
        await this.notifyAdminsSideEffectFailure(payment, 'order', error);
      }
    }

    // 3) Student monthly fee → record against the next unsettled billing period.
    if (payment.type === 'student_monthly_fee') {
      try {
        const participantId =
          await this.attendanceService.getParticipantIdByUserId(
            payment.userId.toString(),
          );
        if (!participantId) {
          throw new Error('No student participant found for user');
        }
        // Reuse the previously-applied period on retry for idempotency.
        let period = payment.appliedPeriod;
        if (period == null) {
          const next =
            await this.attendanceService.getNextUnpaidDueDateInMonthYear(
              participantId,
            );
          period = next?.period;
        }
        await this.attendanceService.recordStudentPayment(
          {
            participantId,
            amount: payment.amount,
            status: 'paid',
            period,
            note: `Payment approved via receipt submission. ${payment.reviewNote || ''}`.trim(),
            receiptUrl: payment.receiptUrl,
          },
          adminUserId,
        );
        if (period != null && payment.appliedPeriod == null) {
          payment.appliedPeriod = period;
          await payment.save();
        }
      } catch (error) {
        await this.notifyAdminsSideEffectFailure(
          payment,
          'student_monthly_fee',
          error,
        );
      }
    }

    // 4) Notify the payer (best-effort; not a tracked side effect).
    try {
      const user = await this.userService.findById(payment.userId.toString());
      if (user) {
        const fullName =
          [user.firstName, user.lastName].filter(Boolean).join(' ') || '';
        if (user.email) {
          await this.mailService.sendPaymentApprovedEmail(
            user.email,
            fullName,
            payment.type,
            payment.amount,
            payment.currency ?? 'ETB',
          );
        }
        await this.notificationService.createForUser(user._id.toString(), {
          type: 'payment_approved',
          title: 'Payment approved',
          message: `Your ${payment.type} payment has been approved.`,
          data: {
            paymentId: payment._id.toString(),
            amount: payment.amount,
            status: payment.status,
            type: payment.type,
          },
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to send payment approved notification:', e);
    }

    if (!payment.sideEffectsApplied) {
      payment.sideEffectsApplied = true;
      await payment.save();
    }
  }

  /** Side effects when a payment is rejected: release any order + email the payer. */
  private async applyRejectionSideEffects(
    payment: PaymentRequestDocument,
    reason?: string,
  ): Promise<void> {
    if (payment.type === 'order' && payment.targetId) {
      try {
        const order = await this.orderModel
          .findOne({ _id: payment.targetId, ...notDeletedFilter() })
          .exec();
        if (order) {
          if (isStockReserved(order.status)) {
            for (const item of order.items ?? []) {
              await this.productService.restoreStock(
                item.productId.toString(),
                item.quantity,
              );
            }
          }
          order.isPaid = false;
          order.status = OrderStatus.PAYMENT_REJECTED;
          await order.save();
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to mark order rejected:', error);
      }
    }

    try {
      const user = await this.userService.findById(payment.userId.toString());
      if (user?.email) {
        const fullName =
          [user.firstName, user.lastName].filter(Boolean).join(' ') || '';
        await this.mailService.sendPaymentRejectedEmail(
          user.email,
          fullName,
          payment.type,
          reason,
          payment.amount,
          payment.currency ?? 'ETB',
        );
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to send payment rejected email:', e);
    }
  }

  /** Alert all admins that an approved payment's side effect failed (best-effort). */
  private async notifyAdminsSideEffectFailure(
    payment: PaymentRequestDocument,
    effect: string,
    error: unknown,
  ): Promise<void> {
    // eslint-disable-next-line no-console
    console.error(
      `Payment ${payment._id.toString()} side-effect '${effect}' failed:`,
      error,
    );
    try {
      const admins = await this.userService.findAdmins();
      await Promise.all(
        admins.map((admin) => {
          const adminId = (
            admin as { _id?: { toString: () => string } }
          )._id?.toString();
          if (!adminId) return Promise.resolve();
          return this.notificationService
            .createForUser(adminId, {
              type: 'payment_side_effect_failed',
              title: 'Approved payment needs attention',
              message: `An approved ${payment.type} payment could not be fully applied (${effect}). Open the payment and use "Retry".`,
              data: {
                paymentId: payment._id.toString(),
                userId: payment.userId.toString(),
                effect,
              },
            })
            .catch(() => undefined);
        }),
      );
    } catch {
      // best-effort; never block approval
    }
  }

  /**
   * Admin payment history with filters. `status`: pending|approved|rejected|all
   * (defaults to pending to preserve the inbox). Optional type, date range, and a text
   * query over reference + payer name/email. Returns the populated rows (newest first).
   */
  async listRequests(filters: {
    status?: string;
    type?: string;
    from?: string;
    to?: string;
    q?: string;
  }): Promise<unknown[]> {
    const f: Record<string, unknown> = { ...notDeletedFilter() };
    const status = filters.status ?? 'pending';
    if (status !== 'all') {
      f.status = status as PaymentRequestStatus;
    }
    if (filters.type) {
      f.type = filters.type;
    }
    if (filters.from || filters.to) {
      const createdAt: Record<string, Date> = {};
      if (filters.from) createdAt.$gte = new Date(filters.from);
      if (filters.to) {
        const t = new Date(filters.to);
        t.setHours(23, 59, 59, 999);
        createdAt.$lte = t;
      }
      f.createdAt = createdAt;
    }

    const docs = await this.paymentModel
      .find(f)
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email')
      .lean()
      .exec();

    // Surface the agreed monthly fee (expected) next to the submitted amount so the
    // admin can compare at a glance (full / partial / overpaid) before approving.
    const userIds = [
      ...new Set(
        docs
          .map((p) => {
            const u = p.userId as { _id?: unknown } | string | undefined;
            return u && typeof u === 'object' && '_id' in u
              ? String(u._id)
              : String(u ?? '');
          })
          .filter(Boolean),
      ),
    ];
    const feeMap = await this.attendanceService.getMonthlyFeesByUserIds(userIds);
    const enriched = docs.map((p) => {
      const u = p.userId as { _id?: unknown } | string | undefined;
      const uid =
        u && typeof u === 'object' && '_id' in u ? String(u._id) : String(u ?? '');
      // expectedFee is the student's agreed monthly fee — only meaningful for
      // student_monthly_fee payments. Showing it on order/enrollment payments
      // mislabels the order total as a fee mismatch.
      const expectedFee =
        p.type === 'student_monthly_fee' ? feeMap.get(uid) : undefined;
      return { ...p, expectedFee };
    });

    if (!filters.q) return enriched;
    const q = filters.q.toLowerCase();
    return enriched.filter((p) => {
      const u = p.userId as
        | { firstName?: string; lastName?: string; email?: string }
        | undefined;
      const name = u
        ? `${u.firstName ?? ''} ${u.lastName ?? ''} ${u.email ?? ''}`.toLowerCase()
        : '';
      return (p.reference ?? '').toLowerCase().includes(q) || name.includes(q);
    });
  }
}

