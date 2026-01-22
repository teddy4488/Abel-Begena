import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Order,
  OrderDocument,
  OrderStatus,
} from '../order/schemas/order.schema';
import { User, UserDocument } from '../user/schemas/user.schema';
import { Class, ClassDocument } from '../class/schemas/class.schema';
import { Teacher, TeacherDocument } from '../teacher/schemas/teacher.schema';
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
      partial: number;
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
    @InjectModel(Teacher.name)
    private readonly teacherModel: Model<TeacherDocument>,
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

  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [
      revenueAgg,
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
      partialStudentPayments,
    ] = await Promise.all([
      this.orderModel.aggregate<MonthlyAggregate>([
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
            total: { $sum: '$totalAmount' },
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
        {
          $group: {
            _id: '$status',
            total: { $sum: 1 },
          },
        },
      ]),
      this.orderModel.aggregate<{ total: number }>([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isActive: true }),
      this.studentParticipantModel.countDocuments(),
      this.studentParticipantModel.countDocuments({ isActive: true }),
      this.orderModel.countDocuments(),
      this.classModel.countDocuments(),
      this.classModel.countDocuments({ isLive: true }),
      this.teacherModel.countDocuments(),
      this.teacherModel.countDocuments({ isActive: true }),
      this.teacherModel.countDocuments({ teacherStatus: 'approved', isActive: true }),
      this.studentAttendanceModel.countDocuments(),
      this.studentAttendanceModel.countDocuments({
        sessionDate: { $gte: startOfMonth },
      }),
      this.studentAttendanceModel.countDocuments({
        sessionDate: { $gte: startOfToday, $lte: endOfToday },
      }),
      this.teacherAttendanceModel.countDocuments(),
      this.teacherAttendanceModel.countDocuments({
        checkInAt: { $gte: startOfMonth },
      }),
      this.teacherAttendanceModel.countDocuments({
        checkInAt: { $gte: startOfToday, $lte: endOfToday },
      }),
      this.studentPaymentModel.countDocuments(),
      this.studentPaymentModel.aggregate<{ total: number }>([
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.studentPaymentModel.countDocuments({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      }),
      this.studentPaymentModel.aggregate<{ total: number }>([
        {
          $match: {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.studentPaymentModel.countDocuments({ status: 'paid' }),
      this.studentPaymentModel.countDocuments({ status: 'unpaid' }),
      this.studentPaymentModel.countDocuments({ status: 'partial' }),
    ]);

    const totalRevenue =
      totalRevenueAgg.length > 0 ? totalRevenueAgg[0].total : 0;

    const totalStudentPaymentsAmount =
      studentPaymentsAgg.length > 0 ? studentPaymentsAgg[0].total : 0;

    const thisMonthStudentPaymentsAmountValue =
      thisMonthStudentPaymentsAmount.length > 0
        ? thisMonthStudentPaymentsAmount[0].total
        : 0;

    const revenueMonthly = this.fillMonthlySeries(revenueAgg, sixMonthsAgo);
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
          partial: partialStudentPayments,
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
}
