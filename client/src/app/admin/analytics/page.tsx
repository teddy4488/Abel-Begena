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
import { TrendingUp, Users, ShoppingBag, DollarSign, BookOpen } from "lucide-react";

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
      <div className="flex items-center justify-center min-h-[400px] rounded-3xl border border-border bg-surface p-6">
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
  const activeUsersLabel = t("admin.console.users", "Registered Users");
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
            "Monitor revenue, user growth, enrollments, and order fulfillment.",
          )}
        </p>
      </motion.div>

      {/* Key Metrics Cards */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          transition={{ delay: 0.2 }}
        >
          <AnalyticsStat
            label={activeUsersLabel}
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
          transition={{ delay: 0.3 }}
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
          transition={{ delay: 0.4 }}
        >
          <AnalyticsStat
            label={t("admin.analytics.totalEnrollments", "Total Enrollments")}
            value={enrollments.length}
            icon={<BookOpen className="w-5 h-5" />}
            color={COLORS.active}
          />
        </motion.div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-surface p-4 shadow-lg sm:rounded-3xl sm:p-5"
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
          className="rounded-3xl border border-border bg-surface p-5 shadow-lg"
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
          className="rounded-3xl border border-border bg-surface p-6 shadow-lg"
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
          className="rounded-3xl border border-border bg-surface p-6 shadow-lg"
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

      {/* Status Breakdown Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("classes.status.active", "Active")}
            </h3>
          </div>
          <p className="text-3xl font-bold text-primary">
            {enrollmentStatusData.find((e) => e.name === t("classes.status.active", "Active"))?.value || 0}
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("classes.status.pending", "Pending")}
            </h3>
          </div>
          <p className="text-3xl font-bold text-primary">
            {enrollmentStatusData.find((e) => e.name === t("classes.status.pending", "Pending"))?.value || 0}
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
              {t("classes.status.withdrawn", "Withdrawn")}
            </h3>
          </div>
          <p className="text-3xl font-bold text-primary">
            {enrollmentStatusData.find((e) => e.name === t("classes.status.withdrawn", "Withdrawn"))?.value || 0}
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
    <div className="rounded-3xl border border-border bg-surface p-4 shadow-lg hover:shadow-xl transition-shadow">
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
