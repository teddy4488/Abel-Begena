import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Order,
  OrderDocument,
  OrderStatus,
} from '../order/schemas/order.schema';
import { User, UserDocument } from '../user/schemas/user.schema';
import { Class, ClassDocument } from '../class/schemas/class.schema';
import {
  StudentAttendanceParticipant,
  StudentAttendanceParticipantDocument,
} from '../attendance/schemas/student-attendance-participant.schema';
import {
  TeacherAttendanceParticipant,
  TeacherAttendanceParticipantDocument,
} from '../attendance/schemas/teacher-attendance-participant.schema';
import {
  StudentAttendance,
  StudentAttendanceDocument,
} from '../attendance/schemas/student-attendance.schema';
import {
  TeacherAttendance,
  TeacherAttendanceDocument,
} from '../attendance/schemas/teacher-attendance.schema';
import {
  StudentPayment,
  StudentPaymentDocument,
} from '../attendance/schemas/student-payment.schema';

type MonthlyValue = {
  label: string;
  total: number;
};

type MonthlyAggregate = {
  _id: { year: number; month: number };
  total: number;
};

type StatusAggregate = { _id: OrderStatus; total: number };

type AnalyticsOverview = {
  revenue: {
    total: number;
    monthly: MonthlyValue[];
  };
  users: {
    total: number;
    active: number;
    monthly: MonthlyValue[];
  };
  students: {
    total: number;
    active: number;
  };
  teachers: {
    total: number;
    active: number;
    approved: number;
  };
  attendance: {
    studentRecords: {
      total: number;
      thisMonth: number;
      today: number;
    };
    teacherRecords: {
      total: number;
      thisMonth: number;
      today: number;
    };
  };
  payments: {
    studentPayments: {
      total: number;
      totalAmount: number;
      thisMonth: number;
      thisMonthAmount: number;
      paid: number;
      unpaid: number;
    };
  };
  orders: {
    total: number;
    statusBreakdown: Record<OrderStatus, number>;
  };
  classes: {
    total: number;
    live: number;
  };
};

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Class.name)
    private readonly classModel: Model<ClassDocument>,
    @InjectModel(StudentAttendanceParticipant.name)
    private readonly studentParticipantModel: Model<StudentAttendanceParticipantDocument>,
    @InjectModel(TeacherAttendanceParticipant.name)
    private readonly teacherParticipantModel: Model<TeacherAttendanceParticipantDocument>,
    @InjectModel(StudentAttendance.name)
    private readonly studentAttendanceModel: Model<StudentAttendanceDocument>,
    @InjectModel(TeacherAttendance.name)
    private readonly teacherAttendanceModel: Model<TeacherAttendanceDocument>,
    @InjectModel(StudentPayment.name)
    private readonly studentPaymentModel: Model<StudentPaymentDocument>,
  ) {}

  /** Phase 5.3: optional branchFilter scopes analytics to a branch (Admin with branchId). */
  async getAnalyticsOverview(branchFilter?: { branchId: string }): Promise<AnalyticsOverview> {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const branchIdObj =
      branchFilter?.branchId && Types.ObjectId.isValid(branchFilter.branchId)
        ? new Types.ObjectId(branchFilter.branchId)
        : null;
    const orderMatch = branchIdObj ? { pickupBranchId: branchIdObj } : {};
    const classMatch = branchIdObj ? { branchId: branchIdObj } : {};
    const participantMatch = branchIdObj ? { branchId: branchIdObj } : {};
    const participantIds =
      branchIdObj
        ? await this.studentParticipantModel.distinct('_id', participantMatch).exec()
        : null;
    const paymentMatch =
      participantIds?.length
        ? { participantId: { $in: participantIds } }
        : participantIds && participantIds.length === 0
          ? { participantId: { $in: [] } }
          : {};
    const attendanceMatch =
      participantIds?.length
        ? { participantId: { $in: participantIds } }
        : participantIds && participantIds.length === 0
          ? { participantId: { $in: [] } }
          : {};

    const [
      revenueAgg,
      studentPaymentMonthlyAgg,
      userAgg,
      statusAgg,
      totalRevenueAgg,
      totalUsers,
      activeUsers,
      totalStudents,
      activeStudents,
      totalOrders,
      totalClasses,
      liveClasses,
      totalTeachers,
      activeTeachers,
      approvedTeachers,
      totalStudentAttendance,
      thisMonthStudentAttendance,
      todayStudentAttendance,
      totalTeacherAttendance,
      thisMonthTeacherAttendance,
      todayTeacherAttendance,
      totalStudentPayments,
      studentPaymentsAgg,
      thisMonthStudentPayments,
      thisMonthStudentPaymentsAmount,
      paidStudentPayments,
      unpaidStudentPayments,
    ] = await Promise.all([
      this.orderModel.aggregate<MonthlyAggregate>([
        {
          $match: {
            createdAt: { $gte: sixMonthsAgo },
            ...orderMatch,
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            total: { $sum: '$totalAmount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      this.studentPaymentModel.aggregate<MonthlyAggregate>([
        {
          $match: {
            status: 'paid',
            ...paymentMatch,
          },
        },
        {
          $group: {
            _id: { year: '$year', month: '$month' },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      this.userModel.aggregate<MonthlyAggregate>([
        {
          $match: {
            createdAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            total: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      this.orderModel.aggregate<StatusAggregate>([
        ...(Object.keys(orderMatch).length ? [{ $match: orderMatch }] : []),
        {
          $group: {
            _id: '$status',
            total: { $sum: 1 },
          },
        },
      ]),
      this.orderModel.aggregate<{ total: number }>([
        ...(Object.keys(orderMatch).length ? [{ $match: orderMatch }] : []),
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isActive: true }),
      this.studentParticipantModel.countDocuments(participantMatch),
      this.studentParticipantModel.countDocuments({ ...participantMatch, isActive: true }),
      this.orderModel.countDocuments(orderMatch),
      this.classModel.countDocuments(classMatch),
      this.classModel.countDocuments({ isLive: true, ...classMatch }),
      this.userModel.countDocuments({ role: 'Teacher' }),
      this.userModel.countDocuments({ role: 'Teacher', isActive: true }),
      this.userModel.countDocuments({
        role: 'Teacher',
        isActive: true,
        $or: [{ 'teacherProfile.teacherStatus': 'approved' }, { teacherStatus: 'approved' }],
      }),
      this.studentAttendanceModel.countDocuments(attendanceMatch),
      this.studentAttendanceModel.countDocuments({
        sessionDate: { $gte: startOfMonth },
        ...attendanceMatch,
      }),
      this.studentAttendanceModel.countDocuments({
        sessionDate: { $gte: startOfToday, $lte: endOfToday },
        ...attendanceMatch,
      }),
      this.teacherAttendanceModel.countDocuments(),
      this.teacherAttendanceModel.countDocuments({
        checkInAt: { $gte: startOfMonth },
      }),
      this.teacherAttendanceModel.countDocuments({
        checkInAt: { $gte: startOfToday, $lte: endOfToday },
      }),
      this.studentPaymentModel.countDocuments(paymentMatch),
      this.studentPaymentModel.aggregate<{ total: number }>([
        ...(Object.keys(paymentMatch).length ? [{ $match: paymentMatch }] : []),
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.studentPaymentModel.countDocuments({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        ...paymentMatch,
      }),
      this.studentPaymentModel.aggregate<{ total: number }>([
        {
          $match: {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            ...paymentMatch,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.studentPaymentModel.countDocuments({ status: 'paid', ...paymentMatch }),
      this.studentPaymentModel.countDocuments({ status: 'unpaid', ...paymentMatch }),
    ]);

    const orderRevenue =
      totalRevenueAgg.length > 0 ? totalRevenueAgg[0].total : 0;
    const totalStudentPaymentsAmount =
      studentPaymentsAgg.length > 0 ? studentPaymentsAgg[0].total : 0;

    const thisMonthStudentPaymentsAmountValue =
      thisMonthStudentPaymentsAmount.length > 0
        ? thisMonthStudentPaymentsAmount[0].total
        : 0;

    const totalRevenue =
      orderRevenue + (totalStudentPaymentsAmount ?? 0);

    const revenueMonthly = this.fillMonthlySeriesCombined(
      revenueAgg,
      studentPaymentMonthlyAgg,
      sixMonthsAgo,
    );
    const userMonthly = this.fillMonthlySeries(userAgg, sixMonthsAgo);

    const statusBreakdown = Object.values(OrderStatus).reduce(
      (acc, status) => ({
        ...acc,
        [status]: statusAgg.find((item) => item._id === status)?.total ?? 0,
      }),
      {} as Record<OrderStatus, number>,
    );

    return {
      revenue: {
        total: totalRevenue,
        monthly: revenueMonthly,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        monthly: userMonthly,
      },
      students: {
        total: totalStudents,
        active: activeStudents,
      },
      teachers: {
        total: totalTeachers,
        active: activeTeachers,
        approved: approvedTeachers,
      },
      attendance: {
        studentRecords: {
          total: totalStudentAttendance,
          thisMonth: thisMonthStudentAttendance,
          today: todayStudentAttendance,
        },
        teacherRecords: {
          total: totalTeacherAttendance,
          thisMonth: thisMonthTeacherAttendance,
          today: todayTeacherAttendance,
        },
      },
      payments: {
        studentPayments: {
          total: totalStudentPayments,
          totalAmount: totalStudentPaymentsAmount,
          thisMonth: thisMonthStudentPayments,
          thisMonthAmount: thisMonthStudentPaymentsAmountValue,
          paid: paidStudentPayments,
          unpaid: unpaidStudentPayments,
        },
      },
      orders: {
        total: totalOrders,
        statusBreakdown,
      },
      classes: {
        total: totalClasses,
        live: liveClasses,
      },
    };
  }

  private fillMonthlySeries(
    data: MonthlyAggregate[],
    startDate: Date,
  ): MonthlyValue[] {
    const series: MonthlyValue[] = [];
    const cursor = new Date(startDate);
    for (let i = 0; i < 6; i += 1) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      const entry = data.find(
        (item) => item._id.year === year && item._id.month === month,
      );
      series.push({
        label: cursor.toLocaleDateString(undefined, {
          month: 'short',
        }),
        total: entry?.total ?? 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return series;
  }

  /** Combines order revenue and student payment revenue by month for dashboard revenue trend. */
  private fillMonthlySeriesCombined(
    orderData: MonthlyAggregate[],
    studentPaymentData: MonthlyAggregate[],
    startDate: Date,
  ): MonthlyValue[] {
    const series: MonthlyValue[] = [];
    const cursor = new Date(startDate);
    for (let i = 0; i < 6; i += 1) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      const orderEntry = orderData.find(
        (item) => item._id.year === year && item._id.month === month,
      );
      const studentEntry = studentPaymentData.find(
        (item) => item._id.year === year && item._id.month === month,
      );
      series.push({
        label: cursor.toLocaleDateString(undefined, {
          month: 'short',
        }),
        total: (orderEntry?.total ?? 0) + (studentEntry?.total ?? 0),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return series;
  }
}
