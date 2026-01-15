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
import {
  StudentAttendanceParticipant,
  StudentAttendanceParticipantDocument,
} from '../attendance/schemas/student-attendance-participant.schema';

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
  ) {}

  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

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
    ]);

    const totalRevenue =
      totalRevenueAgg.length > 0 ? totalRevenueAgg[0].total : 0;

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
