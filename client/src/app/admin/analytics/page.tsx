"use client";

import { useMemo } from "react";
import { AnalyticsLineChart } from "@/components/admin/charts/AnalyticsLineChart";
import {
  useGetAnalyticsOverviewQuery,
  useGetAllEnrollmentsQuery,
} from "@/store/api/adminApi";
import { useI18n } from "@/components/providers/I18nProvider";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  BookOpen,
  GraduationCap,
  UserCheck,
  Clock,
  CreditCard,
  School,
} from "lucide-react";

const COLORS = {
  active: "#10b981",
  pending: "#f59e0b",
  withdrawn: "#ef4444",
  revenue: "#8b5cf6",
  users: "#3b82f6",
  orders: "#ec4899",
};

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useGetAnalyticsOverviewQuery();
  const { data: enrollments = [] } = useGetAllEnrollmentsQuery();
  const { t } = useI18n();

  const enrollmentStatusData = useMemo(() => {
    const counts = enrollments.reduce(
      (acc, entry) => {
        acc[entry.status] = (acc[entry.status] || 0) + 1;
        return acc;
      },
      { active: 0, pending: 0, withdrawn: 0 },
    );
    return [
      {
        name: t("classes.status.active", "Active"),
        value: counts.active,
        color: COLORS.active,
      },
      {
        name: t("classes.status.pending", "Pending"),
        value: counts.pending,
        color: COLORS.pending,
      },
      {
        name: t("classes.status.withdrawn", "Withdrawn"),
        value: counts.withdrawn,
        color: COLORS.withdrawn,
      },
    ].filter((item) => item.value > 0);
  }, [enrollments, t]);

  const orderStatusData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.orders.statusBreakdown).map(([status, count]) => ({
      name: status,
      value: count,
    }));
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] rounded-3xl  surface-elevated p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mb-4"></div>
          <p className="text-sm text-foreground/70">
            {t("admin.console.loading", "Analytics loading...")}
          </p>
        </div>
      </div>
    );
  }

  const revenueLabel = t("admin.console.revenue", "Total Revenue");
  const websiteUsersLabel = t("admin.analytics.websiteUsers", "Website Users");
  const studentsLabel = t("admin.analytics.students", "Attendance Students");
  const ordersLabel = t("admin.console.orderStatus", "Orders");

  return (
    <section className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
          {t("admin.analytics.kicker", "Analytics Dashboard")}
        </p>
        <h1 className="text-3xl md:text-4xl font-serif text-primary">
          {t("admin.analytics.title", "Platform Overview")}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {t(
            "admin.analytics.subtitle",
            "Monitor revenue, user growth, enrollments, attendance, payments, and order fulfillment.",
          )}
        </p>
      </motion.div>

      {/* Key Metrics Cards */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AnalyticsStat
            label={revenueLabel}
            value={data.revenue.total.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
            icon={<DollarSign className="w-5 h-5" />}
            color={COLORS.revenue}
            trend={data.revenue.monthly.length > 1 ? 
              ((data.revenue.monthly[data.revenue.monthly.length - 1]?.total || 0) - 
               (data.revenue.monthly[data.revenue.monthly.length - 2]?.total || 0)) : 0
            }
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <AnalyticsStat
            label={t("admin.analytics.studentPayments", "Student Payments")}
            value={data.payments?.studentPayments?.totalAmount?.toLocaleString("en-US", {
              style: "currency",
              currency: "ETB",
            }) || "0 ETB"}
            icon={<CreditCard className="w-5 h-5" />}
            color="#10b981"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AnalyticsStat
            label={websiteUsersLabel}
            value={data.users.active}
            icon={<Users className="w-5 h-5" />}
            color={COLORS.users}
            trend={data.users.monthly.length > 1 ?
              ((data.users.monthly[data.users.monthly.length - 1]?.total || 0) -
               (data.users.monthly[data.users.monthly.length - 2]?.total || 0)) : 0
            }
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          <AnalyticsStat
            label={studentsLabel}
            value={data.students?.active ?? 0}
            icon={<GraduationCap className="w-5 h-5" />}
            color="#10b981"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <AnalyticsStat
            label={t("admin.analytics.teachers", "Teachers")}
            value={data.teachers?.approved ?? 0}
            icon={<School className="w-5 h-5" />}
            color="#8b5cf6"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
        >
          <AnalyticsStat
            label={t("admin.analytics.studentAttendance", "Student Attendance")}
            value={data.attendance?.studentRecords?.total ?? 0}
            icon={<UserCheck className="w-5 h-5" />}
            color="#3b82f6"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <AnalyticsStat
            label={t("admin.analytics.teacherAttendance", "Teacher Attendance")}
            value={data.attendance?.teacherRecords?.total ?? 0}
            icon={<Clock className="w-5 h-5" />}
            color="#f59e0b"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
        >
          <AnalyticsStat
            label={ordersLabel}
            value={data.orders.total}
            icon={<ShoppingBag className="w-5 h-5" />}
            color={COLORS.orders}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <AnalyticsStat
            label={t("admin.analytics.totalEnrollments", "Total Enrollments")}
            value={enrollments.length}
            icon={<BookOpen className="w-5 h-5" />}
            color={COLORS.active}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.55 }}
        >
          <AnalyticsStat
            label={t("admin.analytics.classes", "Classes")}
            value={data.classes?.total ?? 0}
            icon={<BookOpen className="w-5 h-5" />}
            color="#ec4899"
          />
        </motion.div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl  surface-elevated p-4 shadow-lg sm:rounded-3xl sm:p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-serif text-primary">
              {t("admin.analytics.revenueTrend", "Revenue Trend")}
            </h2>
          </div>
          <AnalyticsLineChart data={data.revenue.monthly} color={COLORS.revenue} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl  surface-elevated p-5 shadow-lg"
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-serif text-primary">
              {t("admin.analytics.userSignups", "User Signups")}
            </h2>
          </div>
          <AnalyticsLineChart data={data.users.monthly} color={COLORS.users} />
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-3xl  surface-elevated p-6 shadow-lg"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-serif text-primary">
              {t("admin.analytics.orderDistribution", "Order Distribution")}
            </h2>
          </div>
          {orderStatusData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="currentColor" />
                  <YAxis stroke="currentColor" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-background-soft)",
                      borderRadius: "12px",
                      border: "1px solid var(--color-border)",
                    }}
                  />
                  <Bar dataKey="value" fill={COLORS.orders} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-foreground/50">
              <p className="text-sm">{t("admin.analytics.noOrderData", "No order data available")}</p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-3xl  surface-elevated p-6 shadow-lg"
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-serif text-primary">
              {t("admin.analytics.enrollmentStatus", "Enrollment Status")}
            </h2>
          </div>
          {enrollmentStatusData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={enrollmentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {enrollmentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-background-soft)",
                      borderRadius: "12px",
                      border: "1px solid var(--color-border)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-foreground/50">
              <p className="text-sm">{t("admin.analytics.noEnrollmentData", "No enrollment data available")}</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Attendance & Payments Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-3xl  surface-elevated p-6 shadow-lg"
        >
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-serif text-primary">
              {t("admin.analytics.attendanceOverview", "Attendance Overview")}
            </h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl card-elevated p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/80 mb-2">
                  {t("admin.analytics.studentRecords", "Student Records")}
                </p>
                <p className="text-2xl font-bold text-primary">{data.attendance?.studentRecords?.total ?? 0}</p>
                <p className="text-xs text-foreground/60 mt-1">
                  {t("admin.analytics.thisMonth", "This month")}: {data.attendance?.studentRecords?.thisMonth ?? 0}
                </p>
                <p className="text-xs text-foreground/60">
                  {t("admin.analytics.today", "Today")}: {data.attendance?.studentRecords?.today ?? 0}
                </p>
              </div>
              <div className="rounded-xl card-elevated p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-secondary/80 mb-2">
                  {t("admin.analytics.teacherRecords", "Teacher Records")}
                </p>
                <p className="text-2xl font-bold text-primary">{data.attendance?.teacherRecords?.total ?? 0}</p>
                <p className="text-xs text-foreground/60 mt-1">
                  {t("admin.analytics.thisMonth", "This month")}: {data.attendance?.teacherRecords?.thisMonth ?? 0}
                </p>
                <p className="text-xs text-foreground/60">
                  {t("admin.analytics.today", "Today")}: {data.attendance?.teacherRecords?.today ?? 0}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-3xl  surface-elevated p-6 shadow-lg"
        >
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-serif text-primary">
              {t("admin.analytics.studentPaymentsOverview", "Student Payments Overview")}
            </h2>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl card-elevated p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary/80 mb-2">
                {t("admin.analytics.totalPayments", "Total Payments")}
              </p>
              <p className="text-2xl font-bold text-primary">
                {data.payments?.studentPayments?.totalAmount?.toLocaleString("en-US", {
                  style: "currency",
                  currency: "ETB",
                }) || "0 ETB"}
              </p>
              <p className="text-xs text-foreground/60 mt-1">
                {t("admin.analytics.totalRecords", "Total records")}: {data.payments?.studentPayments?.total ?? 0}
              </p>
              <p className="text-xs text-foreground/60">
                {t("admin.analytics.thisMonth", "This month")}: {data.payments?.studentPayments?.thisMonthAmount?.toLocaleString("en-US", {
                  style: "currency",
                  currency: "ETB",
                }) || "0 ETB"}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-green-500/10 p-3 text-center">
                <p className="text-xs text-foreground/60 mb-1">{t("admin.analytics.paid", "Paid")}</p>
                <p className="text-lg font-bold text-green-600">{data.payments?.studentPayments?.paid ?? 0}</p>
              </div>
              <div className="rounded-lg bg-yellow-500/10 p-3 text-center">
                <p className="text-xs text-foreground/60 mb-1">{t("admin.analytics.partial", "Partial")}</p>
                <p className="text-lg font-bold text-yellow-600">{data.payments?.studentPayments?.partial ?? 0}</p>
              </div>
              <div className="rounded-lg bg-red-500/10 p-3 text-center">
                <p className="text-xs text-foreground/60 mb-1">{t("admin.analytics.unpaid", "Unpaid")}</p>
                <p className="text-lg font-bold text-red-600">{data.payments?.studentPayments?.unpaid ?? 0}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Detailed Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-3xl  surface-elevated p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("classes.status.active", "Active Enrollments")}
            </h3>
          </div>
          <p className="text-3xl font-bold text-primary">
            {enrollmentStatusData.find((e) => e.name === t("classes.status.active", "Active"))?.value || 0}
          </p>
        </div>
        <div className="rounded-3xl  surface-elevated p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("classes.status.pending", "Pending Enrollments")}
            </h3>
          </div>
          <p className="text-3xl font-bold text-primary">
            {enrollmentStatusData.find((e) => e.name === t("classes.status.pending", "Pending"))?.value || 0}
          </p>
        </div>
        <div className="rounded-3xl  surface-elevated p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <School className="w-4 h-4 text-secondary" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("admin.analytics.totalTeachers", "Total Teachers")}
            </h3>
          </div>
          <p className="text-3xl font-bold text-primary">{data.teachers?.total ?? 0}</p>
          <p className="text-xs text-foreground/60 mt-1">
            {t("admin.analytics.approved", "Approved")}: {data.teachers?.approved ?? 0}
          </p>
        </div>
        <div className="rounded-3xl  surface-elevated p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-secondary" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("admin.analytics.liveClasses", "Live Classes")}
            </h3>
          </div>
          <p className="text-3xl font-bold text-primary">{data.classes?.live ?? 0}</p>
          <p className="text-xs text-foreground/60 mt-1">
            {t("admin.analytics.total", "Total")}: {data.classes?.total ?? 0}
          </p>
        </div>
      </motion.div>
    </section>
  );
}

function AnalyticsStat({
  label,
  value,
  icon,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  trend?: number;
}) {
  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;

  return (
    <div className="rounded-3xl  surface-elevated p-4 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <div style={{ color }}>{icon}</div>}
          <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
            {label}
          </p>
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold ${
              trendPositive
                ? "text-green-600"
                : trendNegative
                  ? "text-red-600"
                  : "text-foreground/50"
            }`}
          >
            <TrendingUp
              className={`w-3 h-3 ${trendNegative ? "rotate-180" : ""}`}
            />
            {Math.abs(trend).toLocaleString()}
          </div>
        )}
      </div>
      <p className="text-2xl md:text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}
