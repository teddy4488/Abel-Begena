"use client";

import { AnalyticsLineChart } from "@/components/admin/charts/AnalyticsLineChart";
import { useGetAnalyticsOverviewQuery } from "@/store/api/adminApi";

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useGetAnalyticsOverviewQuery();

  if (isLoading || !data) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-foreground/70">
        Loading analytics...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <AnalyticsStat
          label="Total Revenue"
          value={data.revenue.total.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        />
        <AnalyticsStat label="Active Users" value={data.users.active} />
        <AnalyticsStat label="Orders" value={data.orders.total} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-5">
          <h2 className="text-lg font-serif text-primary">Revenue Trend</h2>
          <AnalyticsLineChart data={data.revenue.monthly} color="#e879f9" />
        </div>
        <div className="rounded-3xl border border-border bg-surface p-5">
          <h2 className="text-lg font-serif text-primary">User Signups</h2>
          <AnalyticsLineChart data={data.users.monthly} color="#38bdf8" />
        </div>
      </div>
      <div className="rounded-3xl border border-border bg-surface p-6">
        <h2 className="text-lg font-serif text-primary">Order Distribution</h2>
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

