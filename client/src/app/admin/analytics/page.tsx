"use client";

import { AnalyticsLineChart } from "@/components/admin/charts/AnalyticsLineChart";
import {
  useGetAnalyticsOverviewQuery,
  useGetAllEnrollmentsQuery,
} from "@/store/api/adminApi";
import { useI18n } from "@/components/providers/I18nProvider";

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useGetAnalyticsOverviewQuery();
  const { data: enrollments = [] } = useGetAllEnrollmentsQuery();
  const { t } = useI18n();

  if (isLoading || !data) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-foreground/70">
        {t("admin.console.loading", "Analytics loading...")}
      </div>
    );
  }

  const revenueLabel = t("admin.console.revenue", "Total Revenue");
  const activeUsersLabel = t("admin.console.users", "Registered Users");
  const ordersLabel = t("admin.console.orderStatus", "Orders");

  const statusCounts = enrollments.reduce(
    (acc, entry) => {
      acc[entry.status] += 1;
      return acc;
    },
    { active: 0, pending: 0, withdrawn: 0 },
  );

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <AnalyticsStat
          label={revenueLabel}
          value={data.revenue.total.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        />
        <AnalyticsStat label={activeUsersLabel} value={data.users.active} />
        <AnalyticsStat label={ordersLabel} value={data.orders.total} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-5">
          <h2 className="text-lg font-serif text-primary">
            {t("admin.analytics.revenueTrend", "Revenue Trend")}
          </h2>
          <AnalyticsLineChart data={data.revenue.monthly} color="#e879f9" />
        </div>
        <div className="rounded-3xl border border-border bg-surface p-5">
          <h2 className="text-lg font-serif text-primary">
            {t("admin.analytics.userSignups", "User Signups")}
          </h2>
          <AnalyticsLineChart data={data.users.monthly} color="#38bdf8" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-lg font-serif text-primary">
            {t("admin.analytics.orderDistribution", "Order Distribution")}
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {Object.entries(data.orders.statusBreakdown).map(
              ([status, count]) => (
                <div
                  key={status}
                  className="rounded-2xl border border-border/70 px-4 py-3 text-center"
                >
                  <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">
                    {status}
                  </p>
                  <p className="text-2xl font-semibold text-primary">{count}</p>
                </div>
              ),
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-lg font-serif text-primary">
            {t("admin.analytics.enrollmentStatus", "Enrollment Status")}
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
            <AnalyticsStat
              label={t("classes.status.active", "Active")}
              value={statusCounts.active}
            />
            <AnalyticsStat
              label={t("classes.status.pending", "Pending")}
              value={statusCounts.pending}
            />
            <AnalyticsStat
              label={t("classes.status.withdrawn", "Withdrawn")}
              value={statusCounts.withdrawn}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalyticsStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-border bg-(--color-background-soft) p-4">
      <p className="text-xs uppercase tracking-[0.4em] text-secondary/60">
        {label}
      </p>
      <p className="text-2xl font-semibold text-primary">{value}</p>
    </div>
  );
}

